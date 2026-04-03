import connectDB from "@/config/db";
import authAdmin from "@/lib/authAdmin";
import { getRangeStart, STORE_EVENT_TYPES } from "@/lib/storeEvents";
import Product from "@/models/Product";
import StoreEvent from "@/models/StoreEvent";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function buildMatch(range, productId) {
  const match = {};
  const since = getRangeStart(range);

  if (since) {
    match.createdAt = { $gte: since };
  }

  if (productId) {
    match.productId = String(productId);
  }

  return match;
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const range = request.nextUrl.searchParams.get("range") || "7d";
    const productId = request.nextUrl.searchParams.get("productId") || "";
    const match = buildMatch(range, productId);

    await connectDB();

    const [summaryRows, productRows, recentEvents, productOptions] =
      await Promise.all([
        StoreEvent.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$eventType",
              count: { $sum: 1 },
              quantity: { $sum: "$quantity" },
              revenue: { $sum: "$lineTotal" },
            },
          },
        ]),
        StoreEvent.aggregate([
          { $match: match },
          {
            $group: {
              _id: "$productId",
              views: {
                $sum: {
                  $cond: [
                    { $eq: ["$eventType", STORE_EVENT_TYPES.PRODUCT_VIEW] },
                    1,
                    0,
                  ],
                },
              },
              favorites: {
                $sum: {
                  $cond: [
                    { $eq: ["$eventType", STORE_EVENT_TYPES.WISHLIST_ADDED] },
                    1,
                    0,
                  ],
                },
              },
              cartAdds: {
                $sum: {
                  $cond: [
                    { $eq: ["$eventType", STORE_EVENT_TYPES.CART_ADDED] },
                    1,
                    0,
                  ],
                },
              },
              checkoutStarts: {
                $sum: {
                  $cond: [
                    { $eq: ["$eventType", STORE_EVENT_TYPES.CHECKOUT_STARTED] },
                    1,
                    0,
                  ],
                },
              },
              purchases: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$eventType",
                        STORE_EVENT_TYPES.PURCHASE_COMPLETED,
                      ],
                    },
                    "$quantity",
                    0,
                  ],
                },
              },
              revenue: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$eventType",
                        STORE_EVENT_TYPES.PURCHASE_COMPLETED,
                      ],
                    },
                    "$lineTotal",
                    0,
                  ],
                },
              },
            },
          },
          { $match: { _id: { $nin: [null, ""] } } },
          { $sort: { purchases: -1, checkoutStarts: -1, cartAdds: -1, views: -1 } },
          { $limit: 20 },
        ]),
        StoreEvent.find(match)
          .sort({ createdAt: -1 })
          .limit(12)
          .lean(),
        Product.find({}, { name: 1 }).sort({ name: 1 }).lean(),
      ]);

    const recentProductIds = [
      ...new Set(
        [...productRows, ...recentEvents]
          .map((entry) => entry?._id || entry?.productId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const productDocs = recentProductIds.length
      ? await Product.find({ _id: { $in: recentProductIds } }, { name: 1 }).lean()
      : [];

    const productMap = new Map(
      productDocs.map((product) => [String(product._id), product.name])
    );

    const summaryMap = new Map(summaryRows.map((row) => [row._id, row]));
    const overview = {
      views: summaryMap.get(STORE_EVENT_TYPES.PRODUCT_VIEW)?.count || 0,
      favorites: summaryMap.get(STORE_EVENT_TYPES.WISHLIST_ADDED)?.count || 0,
      cartAdds: summaryMap.get(STORE_EVENT_TYPES.CART_ADDED)?.count || 0,
      checkoutStarts:
        summaryMap.get(STORE_EVENT_TYPES.CHECKOUT_STARTED)?.count || 0,
      purchases:
        summaryMap.get(STORE_EVENT_TYPES.PURCHASE_COMPLETED)?.quantity || 0,
      revenue:
        summaryMap.get(STORE_EVENT_TYPES.PURCHASE_COMPLETED)?.revenue || 0,
    };

    return NextResponse.json({
      success: true,
      overview,
      products: productRows.map((row) => ({
        productId: row._id,
        name: productMap.get(String(row._id)) || "Unknown product",
        views: row.views || 0,
        favorites: row.favorites || 0,
        cartAdds: row.cartAdds || 0,
        checkoutStarts: row.checkoutStarts || 0,
        purchases: row.purchases || 0,
        revenue: row.revenue || 0,
      })),
      recentActivity: recentEvents.map((event) => ({
        id: String(event._id),
        eventType: event.eventType,
        productId: event.productId || null,
        productName: event.productId
          ? productMap.get(String(event.productId)) || "Unknown product"
          : "Store",
        quantity: event.quantity || 1,
        lineTotal: event.lineTotal || 0,
        createdAt: event.createdAt,
      })),
      productOptions: productOptions.map((product) => ({
        value: String(product._id),
        label: product.name,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
