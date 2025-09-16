"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { useAppContext } from "@/context/AppContext";
import { useClerk } from "@clerk/nextjs";

// Handles Stripe Checkout interaction
const CheckoutButton = ({ selectedAddress, cartItems, getToken, user }) => {
  const stripe = useStripe();
  const { openSignIn } = useClerk();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      openSignIn();
      return;
    }
    if (!stripe) return toast.error("Stripe not ready");
    if (!selectedAddress) return toast.error("Please select an address");

    const cartItemsArray = Object.entries(cartItems)
      .map(([product, quantity]) => ({ product, quantity }))
      .filter((item) => item.quantity > 0);

    if (cartItemsArray.length === 0) return toast.error("Your cart is empty");

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.post(
        "/api/stripe/create-session",
        {
          items: cartItemsArray,
          address: selectedAddress._id,
          successUrl: `${window.location.origin}/order-placed`,
          cancelUrl: `${window.location.origin}/cart`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (error) toast.error(error.message);
      } else {
        toast.error(data.message || "Unable to start checkout");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      className="w-full h-12 rounded-full font-semibold text-white 
                 bg-primary hover:bg-tertiary active:scale-[0.99]
                 shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
      disabled={loading}
    >
      {loading ? "Processing..." : "Checkout"}
    </button>
  );
};

const OrderSummary = () => {
  const {
    currency,
    router,
    getCartCount,
    getCartAmount,
    getToken,
    user,
    cartItems,
  } = useAppContext();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stripeReady, setStripeReady] = useState(null);

  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).then((stripe) =>
      setStripeReady(stripe)
    );
  }, []);

  useEffect(() => {
    const fetchUserAddresses = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/user/get-address", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          setUserAddresses(data.addresses);
          if (data.addresses.length > 0) setSelectedAddress(data.addresses[0]);
        } else {
          toast.error(data.message || "Unable to fetch addresses");
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message || "Error");
      }
    };

    if (user) fetchUserAddresses();
  }, [user, getToken]);

  const subtotal = getCartAmount();
  const tax = parseFloat((subtotal * 0.13).toFixed(2));
  const total = subtotal + tax;

  const inputCls =
    "flex-grow w-full outline-none px-3 py-3 rounded-md text-blackhex placeholder-gray-500 " +
    "border border-gray-300 focus:border-primary focus:ring-2 focus:ring-secondary/40 " +
    "transition-colors";

  return (
    <div className="w-full md:w-96 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h2 className="text-xl md:text-2xl font-semibold text-blackhex">
        Order <span className="text-primary">Summary</span>
      </h2>

      <hr className="border-gray-200 my-5" />

      <div className="space-y-6">
        {/* Address Selection */}
        <div>
          <label className="text-sm font-medium uppercase text-blackhex block mb-2">
            Select Address
          </label>
          <div className="relative w-full text-sm">
            <button
              className="w-full text-left px-4 pr-10 py-3 bg-white text-blackhex rounded-md 
                         border border-gray-300 focus:border-primary focus:ring-2 focus:ring-secondary/40 
                         transition-colors"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="block truncate">
                {selectedAddress
                  ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state}`
                  : "Select Address"}
              </span>
              <svg
                className={`w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#6B7280"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <ul className="absolute w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-10 py-1.5">
                {userAddresses.map((address, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setSelectedAddress(address);
                      setIsDropdownOpen(false);
                    }}
                    className="cursor-pointer px-4 py-2 hover:bg-secondary/10"
                  >
                    {address.fullName}, {address.area}, {address.city},{" "}
                    {address.state}
                  </li>
                ))}
                <li
                  onClick={() => router.push("/add-address")}
                  className="px-4 py-2 cursor-pointer text-center text-primary hover:bg-secondary/10"
                >
                  + Add New Address
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Promo Code */}
        <div>
          <label className="text-sm font-medium uppercase text-blackhex block mb-2">
            Promo Code
          </label>
          <div className="flex flex-col items-start gap-3">
            <input
              type="text"
              placeholder="Enter promo code"
              className={inputCls}
            />
            <button
              className="h-10 px-6 rounded-full font-semibold text-white 
                         bg-primary hover:bg-tertiary active:scale-[0.99]
                         shadow-md shadow-primary/20 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-base font-medium">
            <p className="uppercase text-gray-600">Items - {getCartCount()}</p>
            <p className="text-blackhex">
              {currency}
              {subtotal.toFixed(2)}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Shipping Fee</p>
            <p className="font-medium text-blackhex">Free</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (13%)</p>
            <p className="font-medium text-blackhex">
              {currency}
              {tax.toFixed(2)}
            </p>
          </div>
          <div className="flex justify-between text-lg md:text-xl font-semibold border-t border-gray-200 pt-3">
            <p className="text-blackhex">Total</p>
            <p className="text-blackhex">
              {currency}
              {total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Checkout */}
      <div className="mt-5">
        {stripeReady && (
          <Elements stripe={stripeReady}>
            <CheckoutButton
              selectedAddress={selectedAddress}
              cartItems={cartItems}
              getToken={getToken}
              user={user}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
