"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { useAppContext } from "@/context/AppContext";

// Handles Stripe Checkout interaction
const CheckoutButton = ({
  addressId,
  guestAddress,
  cartItems,
  getToken,
  isLoggedIn,
  guestId,
}) => {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!stripe) return toast.error("Stripe not ready");
    if (isLoggedIn) {
      if (!addressId) return toast.error("Please provide an address");
    } else {
      if (!guestId) return toast.error("Guest session missing");
      const required = [
        "fullName",
        "phoneNumber",
        "pincode",
        "area",
        "city",
        "state",
      ];
      const incomplete = required.some((f) => !guestAddress[f]);
      if (incomplete) return toast.error("Please complete the address");
    }

    const cartItemsArray = Object.entries(cartItems)
      .map(([product, quantity]) => ({ product, quantity }))
      .filter((item) => item.quantity > 0);

    if (cartItemsArray.length === 0) return toast.error("Your cart is empty");

    try {
      setLoading(true);
      let token;
      if (isLoggedIn && getToken) {
        token = await getToken();
      }
      const payload = {
        items: cartItemsArray,
        successUrl: `${window.location.origin}/order-placed`,
        cancelUrl: `${window.location.origin}/cart`,
      };
      if (isLoggedIn) {
        payload.addressId = addressId;
      } else {
        payload.guestAddress = guestAddress;
        payload.guestId = guestId;
      }
      const { data } = await axios.post(
        "/api/stripe/create-session",
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
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
  const [guestAddress, setGuestAddress] = useState({
    fullName: "",
    phoneNumber: "",
    pincode: "",
    area: "",
    city: "",
    state: "",
  });
  const [stripePromise, setStripePromise] = useState(null);
  const [guestId, setGuestId] = useState(null);

  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).then((stripe) =>
      setStripePromise(stripe)
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
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      }
    };

    if (user) {
      fetchUserAddresses();
    } else {
      let id = localStorage.getItem("guestId");
      if (!id) {
        id = `guest_${crypto.randomUUID()}`;
        localStorage.setItem("guestId", id);
      }
      setGuestId(id);
    }
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
            {user ? "Select Address" : "Enter Address"}
          </label>
          {user ? (
            <div className="relative inline-block w-full text-sm border">
              <button
                className="peer w-full text-left px-4 pr-2 py-2 bg-white text-gray-700 focus:outline-none"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>
                  {selectedAddress
                    ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state}`
                    : "Select Address"}
                </span>
                <svg
                  className={`w-5 h-5 inline float-right transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-0" : "-rotate-90"
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
                <ul className="absolute  w-full bg-white border shadow-md mt-1 z-10 py-1.5">
                  {userAddresses.map((address, index) => (
                    <li
                      key={index}
                      onClick={() => {
                        setSelectedAddress(address);
                        setIsDropdownOpen(false);
                      }}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                    >
                      {address.fullName}, {address.area}, {address.city}{" "}
                      {address.state}
                    </li>
                  ))}
                  <li
                    onClick={() => router.push("/add-address")}
                    className="px-4 py-2 hover:bg-gray-500/10 cursor-pointer text-center"
                  >
                    + Add New Address
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <input
                type="text"
                placeholder="Full Name"
                value={guestAddress.fullName}
                onChange={(e) =>
                  setGuestAddress({ ...guestAddress, fullName: e.target.value })
                }
                className="w-full border p-2"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={guestAddress.phoneNumber}
                onChange={(e) =>
                  setGuestAddress({
                    ...guestAddress,
                    phoneNumber: e.target.value,
                  })
                }
                className="w-full border p-2"
              />
              <input
                type="text"
                placeholder="Pincode"
                value={guestAddress.pincode}
                onChange={(e) =>
                  setGuestAddress({ ...guestAddress, pincode: e.target.value })
                }
                className="w-full border p-2"
              />
              <input
                type="text"
                placeholder="Area"
                value={guestAddress.area}
                onChange={(e) =>
                  setGuestAddress({ ...guestAddress, area: e.target.value })
                }
                className="w-full border p-2"
              />
              <input
                type="text"
                placeholder="City"
                value={guestAddress.city}
                onChange={(e) =>
                  setGuestAddress({ ...guestAddress, city: e.target.value })
                }
                className="w-full border p-2"
              />
              <input
                type="text"
                placeholder="State"
                value={guestAddress.state}
                onChange={(e) =>
                  setGuestAddress({ ...guestAddress, state: e.target.value })
                }
                className="w-full border p-2"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-base font-medium uppercase text-gray-600 block mb-2">
            Promo Code
          </label>
          <div className="flex flex-col items-start gap-3">
            <input
              type="text"
              placeholder="Enter promo code"
              className="flex-grow w-full outline-none p-2.5 text-gray-600 border"
            />
            <button className="bg-orange-600 text-white px-9 py-2 hover:bg-orange-700">
              Apply
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-base font-medium">
            <p className="uppercase text-gray-600">Items - {getCartCount()}</p>
            <p className="text-gray-800">
              {currency}
              {getCartAmount()}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Shipping Fee</p>
            <p className="font-medium text-gray-800">Free</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (13%)</p>
            <p className="font-medium text-gray-800">
              {currency}
              {tax}
            </p>
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
            addressId={user ? selectedAddress?._id : null}
            guestAddress={!user ? guestAddress : null}
            cartItems={cartItems}
            getToken={getToken}
            isLoggedIn={!!user}
            guestId={guestId}
          />
        </Elements>
      )}
    </div>
  );
};

export default OrderSummary;
