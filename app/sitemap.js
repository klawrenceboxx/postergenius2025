import connectDB from "@/config/db";
import Product from "@/models/Product";

const DEFAULT_SITE_URL = "https://postergenius.ca";

function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return rawUrl.replace(/\/+$/, "");
}

function buildUrl(pathname) {
  return `${getSiteUrl()}${pathname}`;
}

const staticRoutes = [
  { pathname: "/", changeFrequency: "daily", priority: 1 },
  { pathname: "/shop", changeFrequency: "daily", priority: 0.9 },
  { pathname: "/about-us", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { pathname: "/contact-us", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/videos", changeFrequency: "monthly", priority: 0.5 },
];

async function getProductEntries() {
  try {
    await connectDB();

    const products = await Product.find(
      { isVisible: true },
      { slug: 1, updatedAt: 1, date: 1 }
    ).lean();

    return products
      .map((product) => {
        const slug =
          typeof product.slug === "string" && product.slug.trim()
            ? product.slug.trim()
            : product._id?.toString?.();

        if (!slug) {
          return null;
        }

        return {
          url: buildUrl(`/product/${encodeURIComponent(slug)}`),
          lastModified: product.updatedAt || product.date || new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to build product sitemap entries:", error);
    return [];
  }
}

export default async function sitemap() {
  const staticEntries = staticRoutes.map((route) => ({
    url: buildUrl(route.pathname),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const productEntries = await getProductEntries();

  return [...staticEntries, ...productEntries];
}
