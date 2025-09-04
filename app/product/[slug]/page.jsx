import ProductPage from "@/components/product/ProductPage";
import connectDB from "@/config/db";
import Product from "@/models/Product";

async function getProduct(slug) {
  await connectDB();
  const doc = await Product.findOne({ slug }).lean();
  if (!doc) return null;
  const base = doc.offerPrice ?? doc.price;
  return {
    _id: doc._id.toString(),
    title: doc.name || doc.title || "",
    description: doc.description || "",
    imageUrl: doc.image?.[0] || "",
    price: doc.price,
    salePrice: doc.offerPrice,
    discount: 0,
    finalPrice: base,
    digitalPrice: doc.digitalPrice || 0,
    slug: doc.slug || slug,
    reviews: doc.reviews || [],
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
  const product = await getProduct(params.slug);
  if (!product) return <div className="px-4 py-6">Product not found.</div>;
  return (
    <div className="px-4 py-6">
      <ProductPage product={product} />
    </div>
  );
}
