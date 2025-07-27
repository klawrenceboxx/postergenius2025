"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { useAppContext } from "@/context/AppContext";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

// Handles Stripe Checkout interaction
const CheckoutButton = ({ selectedAddress, cartItems, getToken }) => {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!stripe) return toast.error("Stripe not ready");
    if (!selectedAddress) return toast.error("Please select an address");

    let cartItemsArray = Object.entries(cartItems)
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
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      className="w-full bg-orange-600 text-white py-3 mt-5 hover:bg-orange-700 disabled:opacity-50"
      disabled={loading}
    >
      {loading ? "Processing..." : "Checkout"}
    </button>
  );
};

const OrderSummary = () => {
  const { currency, router, getCartAmount, getToken, user, cartItems } =
    useAppContext();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).then((stripe) =>
      setStripePromise(stripe)
    );
  }, []);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

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
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      }
    };

    if (user) fetchUserAddresses();
  }, [user, getToken]);

  const subtotal = getCartAmount();
  const tax = parseFloat((subtotal * 0.13).toFixed(2));
  const total = subtotal + tax;

  return (
    <div className="w-full md:w-96 bg-gray-500/5 p-5">
      <h2 className="text-xl md:text-2xl font-medium text-gray-700">
        Order Summary
      </h2>
      <hr className="border-gray-500/30 my-5" />

      <div className="space-y-6">
        {/* Address Selection */}
        <div>
          <label className="text-base font-medium uppercase text-gray-600 block mb-2">
            Select Address
          </label>
          <div className="relative inline-block w-full text-sm border">
            <button
              className="peer w-full text-left px-4 pr-2 py-2 bg-white text-gray-700 focus:outline-none"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedAddress
                ? selectedAddress.area + `, ` + selectedAddress.city
                : "Select Address"}
            </button>
            {isDropdownOpen && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 shadow-md">
                {userAddresses.map((address) => (
                  <li
                    key={address._id}
                    onClick={() => {
                      setSelectedAddress(address);
                      setIsDropdownOpen(false);
                    }}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                  >
                    {address.area}, {address.city}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-gray-600">Subtotal</p>
            <p className="font-medium text-gray-800">
              {currency}
              {subtotal}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (13%)</p>
            <p className="font-medium text-gray-800">
              {currency}
              {tax}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Shipping Fee</p>
            <p className="font-medium text-gray-800">Free</p>
          </div>
          <div className="flex justify-between text-lg md:text-xl font-medium border-t pt-3">
            <p>Total</p>
            <p>
              {currency}
              {total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {stripePromise && (
        <Elements stripe={stripePromise}>
          <CheckoutButton
            selectedAddress={selectedAddress}
            cartItems={cartItems}
            getToken={getToken}
          />
        </Elements>
      )}
    </div>
  );
};

export default OrderSummary;
