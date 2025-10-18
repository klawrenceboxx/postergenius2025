import { redirect } from "next/navigation";

export const metadata = {
  title: "All Products | PosterGenius",
  description:
    "Browse the complete PosterGenius catalog of posters, art prints, and decor for every fandom.",
  alternates: { canonical: "https://postergenius.ca/all-products" },
  openGraph: {
    title: "All Products | PosterGenius",
    description:
      "Browse the complete PosterGenius catalog of posters, art prints, and decor for every fandom.",
    url: "https://postergenius.ca/all-products",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Products | PosterGenius",
    description:
      "Browse the complete PosterGenius catalog of posters, art prints, and decor for every fandom.",
  },
};

const AllProductsPage = () => {
  redirect("/shop");
  return null;
};

export default AllProductsPage;
