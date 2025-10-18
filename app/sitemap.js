import { MetadataRoute } from "next";

const BASE_URL = "https://postergenius.ca";

/**
 * @returns {MetadataRoute.Sitemap}
 */
export default function sitemap() {
  const routes = [
    "",
    "/about-us",
    "/shop",
    "/all-products",
    "/contact-us",
    "/add-address",
    "/cart",
    "/checkout",
    "/wishlist",
    "/my-orders",
    "/order-confirmation",
    "/order-placed",
    "/seller",
    "/seller/orders",
    "/seller/product-list",
    "/seller/reviews",
    "/seller/discounts",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route || "/"}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.6,
  }));
}
