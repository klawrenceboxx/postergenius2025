export const metadata = {
  title: "Order Confirmation | PosterGenius",
  description:
    "Thanks for shopping with PosterGenius. Review your confirmed order details and next steps for delivery.",
  alternates: { canonical: "https://postergenius.ca/order-confirmation" },
  openGraph: {
    title: "Order Confirmation | PosterGenius",
    description:
      "Thanks for shopping with PosterGenius. Review your confirmed order details and next steps for delivery.",
    url: "https://postergenius.ca/order-confirmation",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Order Confirmation | PosterGenius",
    description:
      "Thanks for shopping with PosterGenius. Review your confirmed order details and next steps for delivery.",
  },
};

export default function OrderConfirmationPage() {
  return (
    <main className="px-6 md:px-16 lg:px-32 py-16">
      <h1 className="text-3xl font-semibold text-blackhex">
        Order Confirmation | PosterGenius
      </h1>
      <p className="mt-4 max-w-2xl text-gray-600">
        Your order is confirmed. A detailed receipt has been emailed to you with tracking and download
        information where applicable.
      </p>
    </main>
  );
}
