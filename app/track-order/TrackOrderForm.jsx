"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TrackOrderForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const { data } = await axios.post("/api/order/access", {
        email,
        orderNumber,
      });

      if (!data?.success || !data?.token || !data?.orderId) {
        toast.error(data?.message || "Unable to verify that order.");
        return;
      }

      router.push(`/orders/${data.orderId}?token=${data.token}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Unable to verify that order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-stone-50 px-6 py-12 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-[28px] bg-[#111111] p-8 text-white shadow-xl md:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#d7c7a8]">
              Order Lookup
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Check your order status or download your digital print.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
              Enter the same email you used at checkout and the order number you
              received after purchase. If the details match, you&apos;ll get secure
              access to that order only.
            </p>
          </section>

          <section className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm md:p-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="order-number"
                  className="text-sm font-medium text-stone-800"
                >
                  Order Number
                </label>
                <input
                  id="order-number"
                  type="text"
                  autoComplete="off"
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Example: 7A1B2C3D"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-stone-800"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Checking..." : "Track Order"}
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
