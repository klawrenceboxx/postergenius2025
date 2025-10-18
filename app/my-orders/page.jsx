import { Suspense } from "react";
import OrderConfirmationWithOrders from "./OrderClient";

export const metadata = {
  title: "My Orders | PosterGenius",
  description:
    "Track your PosterGenius orders, download digital art, and review recent purchases in one place.",
  alternates: { canonical: "https://postergenius.ca/my-orders" },
  openGraph: {
    title: "My Orders | PosterGenius",
    description:
      "Track your PosterGenius orders, download digital art, and review recent purchases in one place.",
    url: "https://postergenius.ca/my-orders",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Orders | PosterGenius",
    description:
      "Track your PosterGenius orders, download digital art, and review recent purchases in one place.",
  },
};

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderConfirmationWithOrders />
    </Suspense>
  );
}
