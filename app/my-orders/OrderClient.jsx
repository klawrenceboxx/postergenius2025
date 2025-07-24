"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAppContext } from "@/context/AppContext";
import toast from "react-hot-toast";
import Image from "next/image";
import { assets, orderDummyData } from "@/assets/assets";
import Loading from "@/components/Loading";
import { Suspense } from "react";

const OrderConfirmationWithOrders = () => {
  const { setCartItems, getToken, user, currency } = useAppContext();
  const searchParams = useSearchParams();
  const [confirming, setConfirming] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Step 1: Confirm order with Stripe session_id
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return setConfirming(false);

    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.post(
          "/api/stripe/confirm",
          { sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success) {
          setCartItems({});
          toast.success("Order placed successfully");
        } else {
          toast.error(data.message || "Order confirmation failed");
        }
      } catch (err) {
        toast.error(err.message || "Error confirming order");
      } finally {
        setConfirming(false);
      }
    })();
  }, [searchParams, getToken, setCartItems]);

  // Step 2: Fetch orders after confirmation completes
  useEffect(() => {
    if (!user || confirming) return;

    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/order/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setOrders(data.orders);
        } else {
          toast.error(data.message + " Please try again later.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching orders");
        setOrders(orderDummyData);
      } finally {
        setLoadingOrders(false);
      }
    })();
  }, [user, confirming, getToken]);

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-32 py-6 min-h-screen">
        {confirming ? (
          <p className="text-lg text-gray-500 text-center py-12">
            Confirming your order...
          </p>
        ) : loadingOrders ? (
          <Loading />
        ) : (
          <>
            <h2 className="text-lg font-medium mt-6">Order Confirmed</h2>
            <p className="mb-4 text-sm text-gray-500">
              Here are your latest orders:
            </p>
            <div className="max-w-5xl border-t border-gray-300 text-sm">
              {orders.map((order, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row gap-5 justify-between p-5 border-b border-gray-300"
                >
                  <div className="flex-1 flex gap-5 max-w-80">
                    {order.items.map((item, i) => (
                      <Image
                        key={i}
                        src={item.product.image?.[0] || assets.box_icon}
                        alt={item.product.name}
                        className="max-w-16 max-h-16 object-cover"
                        width={64}
                        height={64}
                      />
                    ))}
                    <p className="flex flex-col gap-3">
                      <span className="font-medium text-base">
                        {order.items
                          .map(
                            (item) => item.product.name + ` x ${item.quantity}`
                          )
                          .join(", ")}
                      </span>
                      <span>Items : {order.items.length}</span>
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-medium">
                        {order.address.fullName}
                      </span>
                      <br />
                      <span>{order.address.area}</span>
                      <br />
                      <span>{`${order.address.city}, ${order.address.state}`}</span>
                      <br />
                      <span>{order.address.phoneNumber}</span>
                    </p>
                  </div>
                  <p className="font-medium my-auto">
                    {currency}
                    {order.amount}
                  </p>
                  <div>
                    <p className="flex flex-col">
                      <span>Method : COD</span>
                      <span>
                        Date : {new Date(order.date).toLocaleDateString()}
                      </span>
                      <span>Payment : Pending</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default OrderConfirmationWithOrders;
