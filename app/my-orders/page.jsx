import { Suspense } from "react";
import MyOrdersClient from "./MyOrdersClient";

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyOrdersClient />
    </Suspense>
  );
}
