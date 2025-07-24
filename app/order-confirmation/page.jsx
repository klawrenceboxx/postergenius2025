"use client";
import { useEffect, useState } from "react"; //useStae for loading states
import { useSearchParams, useRouter } from "next/navigation"; //added useRouter for CTA navigation
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAppContext } from "@/context/AppContext";
import toast from "react-hot-toast";

const OrderConfirmation = () => {
  const { setCartItems, getToken } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter(); // Needed for redirect button
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      console.log("Confirming Stripe session:", sessionId);

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
        } catch (error) {
          toast.error(error.message || "Error confirming order");
        } finally {
          setLoading(false); // set loading to false after request finishes
        }
      })();
    } else {
      setLoading(false); // Prevent spinner hang if no session_id in URL
    }
  }, [searchParams, getToken, setCartItems]);

  return (
    <>
      <Navbar />
      <div className="h-screen flex flex-col justify-center items-center gap-5">
        {loading ? (
          <p className="text-lg text-gray-500">Confirming your order...</p> //Spinner text while waiting
        ) : (
          <>
            <div className="text-center text-2xl font-semibold">
              Order Confirmed
              <br />
              <button
                onClick={() => router.push("/")} //CTA to go back to homepage
                className="mt-4 text-blue-600 underline hover:text-blue-800
          "
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
};

export default OrderConfirmation;
