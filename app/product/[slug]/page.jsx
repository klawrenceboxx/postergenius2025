// app/product/[slug]/page.jsx
import ProductPage from "@/components/product/ProductPage";
import connectDB from "@/config/db";
import Product from "@/models/Product";
import mongoose from "mongoose";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { augmentProductWithPricing } from "@/lib/pricing";

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

  const plain = {
    ...doc,
    _id: doc._id.toString(),
    productId: doc._id.toString(),
  };

  const enriched = augmentProductWithPricing(plain);
  const pricing = enriched.pricing;

  const sizes = (pricing?.physicalOptions || []).map((option) => ({
    size: option.dimensions,
    price: option.finalPrice,
    label: option.label,
    basePrice: option.basePrice,
  }));

  return {
    ...enriched,
    title: enriched.name || enriched.title || "",
    imageUrl: enriched.image?.[0] || "",
    imageGallery: enriched.image || [],
    description: enriched.description || "",
    price: pricing?.defaultPhysicalBasePrice ?? enriched.price ?? 0,
    finalPrice: pricing?.defaultPhysicalFinalPrice ?? enriched.finalPrice ?? 0,
    salePrice:
      pricing?.physicalDiscount > 0 ? pricing.defaultPhysicalFinalPrice : null,
    digitalPrice: enriched.digitalPrice ?? pricing?.digitalBasePrice ?? 6.5,
    digitalDisplayPrice:
      pricing?.digitalFinalPrice ?? enriched.digitalDisplayPrice,
    slug: enriched.slug || slugOrId,
    category: enriched.category || null,
    reviews: enriched.reviews || [],
    orientation: enriched.orientation || "portrait",
    printfulEnabled: !!(
      enriched.isPrintfulEnabled ??
      enriched.printfulEnabled ??
      enriched.PrintfulEnabled
    ),
    detailsHtml:
      enriched.detailsHtml || "Premium materials and high-resolution print.",
    shippingHtml: enriched.shippingHtml || "Ships in 3–5 business days.",
    returnsHtml: enriched.returnsHtml || "30-day return policy.",
    physicalPricing: pricing?.physicalPricing || {},
    physicalOptions: sizes,
    defaultPhysicalDimensions:
      pricing?.defaultPhysicalDimensions || enriched.defaultPhysicalDimensions,
    variations: [
      {
        type: "default",
        imageUrl: enriched.image?.[0] || "",
        sizes,
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
      <div className=" lg:px-8 pt-2 border-red-500 border-2 ">
        {/* ProductPage/Infos must call addToCart with:
           {
             productId: product.productId,
             title: product.name,
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
