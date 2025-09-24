import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ShopClient from "@/components/ShopClient";
import { headers } from "next/headers";

const ensureAbsoluteUrl = (value) => {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/$/, "");
  }

  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${value.replace(/\/$/, "")}`;
};

// change later to explicitly pass postergenius.ca as next public site url
const resolveBaseUrl = () => {
  const envUrl =
    ensureAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    ensureAbsoluteUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    ensureAbsoluteUrl(process.env.NEXTAUTH_URL) ||
    ensureAbsoluteUrl(process.env.SITE_URL) ||
    ensureAbsoluteUrl(process.env.VERCEL_URL);

  if (envUrl) return envUrl;

  const headerList = headers();
  const host = headerList.get("host");
  if (!host) return undefined;

  const protocol =
    host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${protocol}://${host}`;
};

const fetchProducts = async () => {
  try {
    const baseUrl = resolveBaseUrl();
    if (!baseUrl) return [];

    const response = await fetch(`${baseUrl}/api/product/list`, {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data?.success || !Array.isArray(data.products)) return [];

    return data.products;
  } catch (error) {
    console.error("Failed to load products for shop page", error);
    return [];
  }
};

const ShopPage = async () => {
  const products = await fetchProducts();

  return (
    <>
      <Navbar />
      <ShopClient products={products} />
      <Footer />
    </>
  );
};

export default ShopPage;
