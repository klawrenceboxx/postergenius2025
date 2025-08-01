import { Suspense } from "react";
import OrderConfirmationWithOrders from "./OrderClient";

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderConfirmationWithOrders />
    </Suspense>
  );
}
