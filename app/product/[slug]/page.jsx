// app/product/[slug]/page.jsx
import ProductPage from "@/components/product/ProductPage";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import mongoose from "mongoose";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

async function getProduct(slugOrId) {
  await connectDB();

  // try ObjectId first, then slug
  let doc = null;
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    doc = await Product.findById(slugOrId).lean();
  }
  if (!doc) {
    doc = await Product.findOne({ slug: slugOrId }).lean();
  }
  if (!doc) return null;

  const base = doc.offerPrice ?? doc.price;
  const landscape = doc.orientation === "landscape";

  const sizes = landscape
    ? [
        { size: "18x12", price: base },
        { size: "24x18", price: Math.round(base * 1.2 * 100) / 100 },
        { size: "36x24", price: Math.round(base * 1.5 * 100) / 100 },
      ]
    : [
        { size: "12x18", price: base },
        { size: "18x24", price: Math.round(base * 1.2 * 100) / 100 },
        { size: "24x36", price: Math.round(base * 1.5 * 100) / 100 },
      ];

  return {
    // expose BOTH for compatibility
    _id: doc._id.toString(),
    productId: doc._id.toString(), // alias for frontend/cart

    title: doc.name || doc.title || "",
    imageUrl: doc.image?.[0] || "",
    imageGallery: doc.image || [],
    description: doc.description || "",

    // prices
    price: doc.price,
    salePrice: doc.offerPrice ?? null,
    finalPrice: base, // default physical price
    digitalPrice: doc.digitalPrice || base,

    slug: doc.slug || slugOrId,
    category: doc.category || null,
    reviews: doc.reviews || [],
    orientation: doc.orientation || "portrait",
    printfulEnabled: !!(doc.printfulEnabled ?? doc.PrintfulEnabled),

    detailsHtml:
      doc.detailsHtml || "Premium materials and high-resolution print.",
    shippingHtml: doc.shippingHtml || "Ships in 3–5 business days.",
    returnsHtml: doc.returnsHtml || "30-day return policy.",

    variations: [
      {
        type: "default",
        imageUrl: doc.image?.[0] || "",
        sizes, // [{ size, price }, ...]
      },
    ],
  };
}

export default async function Page({ params }) {
  const { slug } = await params; // Next 15
  const product = await getProduct(slug);

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="px-6 md:px-16 lg:px-32 pt-14">
          <div className="px-4 py-6">Product not found.</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-16 pt-6 space-y-10">
        {/* ProductPage/Infos must call addToCart with:
           {
             productId: product.productId,
             title: product.title,
             imageUrl: product.imageUrl,
             price: (format === "digital" ? product.digitalPrice : selectedSize.price),
             quantity: 1,
             slug: product.slug,
             format,                             // "physical" | "digital"
             dimensions: format === "digital" ? "digital" : selectedSize.size
           }
        */}
        <ProductPage product={product} />
      </div>
      <Footer />
    </>
  );
}
