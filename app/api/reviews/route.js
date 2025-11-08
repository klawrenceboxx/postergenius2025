import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
import mongoose from "mongoose";
import connectDB from "@/config/db";
import Review from "@/models/Review";
import Order from "@/models/Order";

const sanitizeReview = (review) => {
  if (!review) return review;
  const {
    _id,
    userId,
    username,
    rating,
    comment,
    productId,
    createdAt,
    updatedAt,
  } = review;
  return {
    _id: _id?.toString?.() || _id,
    userId: userId ?? null,
    username,
    rating,
    comment,
    productId: productId ?? null,
    createdAt,
    updatedAt,
  };
};

async function resolveUserName(userId) {
  if (!userId) return null;
  try {
    const user = await clerkClient.users.getUser(userId);
    if (!user) return null;

    const username =
      user.username ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

    if (username) return username;

    const primaryEmail = user.emailAddresses?.find(
      (email) => email.id === user.primaryEmailAddressId
    );

    if (primaryEmail?.emailAddress) {
      return primaryEmail.emailAddress.split("@")[0];
    }

    return "Customer";
  } catch (error) {
    console.error("Failed to resolve username from Clerk", error);
    return null;
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const limit = 20;
    const filter = {};

    if (productId) {
      filter.productId = productId;
    }

    const matchStage = Object.keys(filter).length ? filter : {};

    const [reviews, total, averageResult] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
          },
        },
      ]),
    ]);

    const average = averageResult?.[0]?.averageRating || 0;

    return NextResponse.json({
      success: true,
      reviews: reviews.map(sanitizeReview),
      total,
      average,
      limit,
    });
  } catch (error) {
    console.error("[REVIEWS][GET]", error);
    return NextResponse.json(
      { success: false, message: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId =
      typeof body.productId === "string" ? body.productId.trim() : "";
    const rating = Number(body.rating);
    const comment = (body.comment || "").trim();
    const providedUsername = (body.username || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment is required" },
        { status: 400 }
      );
    }

    const user = await clerkClient.users.getUser(userId);
    const role = user?.publicMetadata?.role;
    const isAdmin = role === "admin";

    let reviewUserId = userId;
    let username = await resolveUserName(userId);

    if (isAdmin) {
      reviewUserId = body.userId ? String(body.userId) : null;

      if (providedUsername) {
        username = providedUsername;
      } else if (reviewUserId) {
        const impersonatedName = await resolveUserName(reviewUserId);
        username = impersonatedName || username;
      }
    } else if (providedUsername && !username) {
      username = providedUsername;
    }

    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 }
      );
    }

    let normalizedProductId = null;

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json(
          { success: false, message: "Invalid product" },
          { status: 400 }
        );
      }
      normalizedProductId = productId;
    }

    if (!isAdmin) {
      if (!normalizedProductId) {
        return NextResponse.json(
          { success: false, message: "Product ID is required" },
          { status: 400 }
        );
      }

      const productObjectId = new mongoose.Types.ObjectId(normalizedProductId);

      const hasPurchased = await Order.exists({
        userId: reviewUserId,
        status: "completed",
        "items.product": productObjectId,
      });

      if (!hasPurchased) {
        return NextResponse.json(
          {
            success: false,
            message: "Only verified buyers can review this product.",
          },
          { status: 403 }
        );
      }

      const existing = await Review.findOne({
        userId: reviewUserId,
        productId: normalizedProductId,
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message: "You have already reviewed this product.",
          },
          { status: 409 }
        );
      }
    }

    const review = await Review.create({
      userId: reviewUserId,
      username,
      productId: normalizedProductId,
      rating,
      comment,
    });

    return NextResponse.json({
      success: true,
      review: sanitizeReview(review),
    });
  } catch (error) {
    console.error("[REVIEWS][POST]", error);

    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit review" },
      { status: 500 }
    );
  }
}
