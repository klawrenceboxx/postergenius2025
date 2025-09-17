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
    _id: doc._id.toString(),
    title: doc.name || doc.title || "",
    category: doc.category || null, // ← used for breadcrumb (optional)
    description: doc.description || "",
    imageUrl: doc.image?.[0] || "",
    imageGallery: doc.image || [], // ← keep your gallery untouched
    price: doc.price,
    salePrice: doc.offerPrice,
    discount: 0,
    finalPrice: base,
    digitalPrice: doc.digitalPrice || base,
    slug: doc.slug || slugOrId,
    reviews: doc.reviews || [],
    orientation: doc.orientation || "portrait",
    // printfulEnabled: !!doc.printfulEnabled, // ← controls greying Physical
    printfulEnabled: true, // ← controls greying Physical
    detailsHtml:
      doc.detailsHtml || "Premium materials and high-resolution print.",
    shippingHtml: doc.shippingHtml || "Ships in 3–5 business days.",
    returnsHtml: doc.returnsHtml || "30-day return policy.",
    variations: [
      {
        type: "default",
        imageUrl: doc.image?.[0] || "",
        sizes: [
          { size: "12x18", price: base },
          { size: "18x24", price: Math.round(base * 1.2 * 100) / 100 },
          { size: "24x36", price: Math.round(base * 1.5 * 100) / 100 },
        ],
      },
    ],
  };
}

export default async function Page({ params }) {
  const { slug } = await params; // Next 15: params is a Promise
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
        <ProductPage product={product} />
      </div>
      <Footer />
    </>
  );
}
