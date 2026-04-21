const DEFAULT_SITE_URL = "https://postergenius.ca";

function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return rawUrl.replace(/\/+$/, "");
}

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/seller/",
        "/cart",
        "/checkout",
        "/my-orders",
        "/orders/",
        "/order-confirmation",
        "/order-placed",
        "/track-order",
        "/wishlist",
        "/add-address",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
