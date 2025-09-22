"use client";
// 👆 This tells Next.js this file is a client component (runs in the browser, not only on the server)

import React, { useEffect, useState } from "react"; // React core features
import axios from "axios"; // HTTP requests to your backend API routes
import toast from "react-hot-toast"; // Popup notifications (success/error messages)
import { loadStripe } from "@stripe/stripe-js"; // Loads Stripe object from your public key
import { Elements, useStripe } from "@stripe/react-stripe-js";
// Elements = provider wrapper for Stripe context
// useStripe = React hook to access Stripe inside your component
import { useAppContext } from "@/context/AppContext";
// 👆 Your global app context (cart, user, totals, router, etc.)
import { useClerk } from "@clerk/nextjs";
// 👆 Auth provider, handles login/signup with Clerk

// -------------------- Checkout Button --------------------
const CheckoutButton = ({ selectedAddress, cartItems, getToken, user }) => {
  const stripe = useStripe(); // gets the Stripe instance created by <Elements>
  const { openSignIn } = useClerk(); // Clerk helper to open the login modal
  const [loading, setLoading] = useState(false); // tracks button loading state

  // -------------------- Handle Checkout --------------------
  const handleCheckout = async () => {
    console.log("🔹 Checkout started");
    console.log("User:", user);
    console.log("Selected Address:", selectedAddress);
    console.log("Cart Items (raw):", cartItems);

    // 🛑 Block if user isn’t logged in (open login modal instead)
    if (!user) {
      console.warn("⚠️ No user, opening sign-in");
      openSignIn();
      return;
    }

    // 🛑 Block if Stripe object hasn’t loaded yet
    if (!stripe) {
      console.error("❌ Stripe not ready");
      return toast.error("Stripe not ready");
    }

    // 🛑 Block if user hasn’t selected a shipping address
    if (!selectedAddress) {
      console.error("❌ No address selected");
      return toast.error("Please select an address");
    }

    // 🔄 Convert cartItems (object) → array that the server understands
    const cartItemsArray = Object.entries(cartItems)
      // Object.entries turns { key: value } into [[key, value], ...]
      .map(([key, entry]) => {
        const isObj = typeof entry === "object" && entry !== null;
        // productId: either stored inside entry OR strip composite key (id-format-size → just id)
        const productId = isObj ? entry.productId : key.split("-")[0];
        // quantity: use entry.quantity if object, else number directly
        const quantity = isObj ? entry.quantity : entry;

        return {
          productId, // ✅ Mongo ObjectId of product
          quantity, // ✅ how many items of this product
          ...(isObj
            ? { format: entry.format, dimensions: entry.dimensions } // optional extras
            : {}),
        };
      })
      .filter((item) => item.quantity > 0); // remove anything with 0 or invalid quantity

    console.log("Cart Items (normalized):", cartItemsArray);

    // 🛑 Block if somehow nothing is left
    if (cartItemsArray.length === 0) {
      console.error("❌ Cart is empty after filtering");
      return toast.error("Your cart is empty");
    }

    // -------------------- Try to create a Stripe Checkout session --------------------
    try {
      setLoading(true); // disable button, show "Processing..."
      const token = await getToken();
      // 👆 Clerk JWT (used so backend can verify the request comes from a logged-in user)
      console.log("Auth Token:", token);

      // POST request to your backend API
      const { data } = await axios.post(
        "/api/stripe/create-session", // your Next.js API route
        {
          items: cartItemsArray, // what you’re buying
          address: selectedAddress._id, // which address to ship to
          successUrl: `${window.location.origin}/order-placed`, // where to go if payment succeeds
          cancelUrl: `${window.location.origin}/cart`, // where to go if payment cancelled
        },
        { headers: { Authorization: `Bearer ${token}` } } // attach JWT for server auth
      );

      console.log("Stripe session response:", data);

      // ✅ If server successfully created session → redirect user to Stripe
      if (data.success) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (error) {
          console.error("❌ Stripe redirect error:", error);
          toast.error(error.message);
        }
      } else {
        // ❌ If backend returned failure
        console.error("❌ Stripe session creation failed:", data.message);
        toast.error(data.message || "Unable to start checkout");
      }
    } catch (error) {
      // ❌ If network error or backend error
      console.error("❌ Checkout error:", error);
      toast.error(error?.response?.data?.message || error.message || "Error");
    } finally {
      setLoading(false);
      console.log("✅ Checkout finished");
    }
  };

  return (
    <button
      onClick={handleCheckout}
      className="w-full h-12 rounded-full font-semibold text-white 
                 bg-primary hover:bg-tertiary active:scale-[0.99]
                 shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
      disabled={loading} // disable if already processing
    >
      {loading ? "Processing..." : "Checkout"}
    </button>
  );
};

// -------------------- Order Summary (right panel) --------------------
const OrderSummary = () => {
  // 👇 Pull shared app state from your AppContext provider
  const {
    currency, // currency symbol e.g. "$"
    router, // Next.js router for navigation
    getCartCount, // function to count total cart items
    getCartAmount, // function to sum up subtotal
    getToken, // function to fetch Clerk JWT
    user, // logged-in user object (or null if guest)
    cartItems, // current cart contents
  } = useAppContext();

  // Local state for this component only
  const [selectedAddress, setSelectedAddress] = useState(null); // which shipping address selected
  const [userAddresses, setUserAddresses] = useState([]); // all addresses saved to user
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // toggle address dropdown
  const [stripeReady, setStripeReady] = useState(null); // Stripe instance once loaded

  // -------------------- Load Stripe on mount --------------------
  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).then(
      (stripe) => {
        console.log("Stripe Loaded:", stripe);
        setStripeReady(stripe);
      }
    );
  }, []);

  // -------------------- Fetch user addresses if logged in --------------------
  useEffect(() => {
    const fetchUserAddresses = async () => {
      console.log("Fetching user addresses...");
      try {
        const token = await getToken(); // get Clerk JWT
        console.log("Auth Token (addresses):", token);

        const { data } = await axios.get("/api/user/get-address", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("User addresses response:", data);

        if (data.success) {
          setUserAddresses(data.addresses); // save list of addresses
          if (data.addresses.length > 0) {
            setSelectedAddress(data.addresses[0]); // default: first address
          }
        } else {
          toast.error(data.message || "Unable to fetch addresses");
        }
      } catch (error) {
        console.error("❌ Error fetching addresses:", error);
        toast.error(error?.response?.data?.message || error.message || "Error");
      }
    };

    if (user) fetchUserAddresses(); // only run if logged in
  }, [user, getToken]);

  // -------------------- Totals --------------------
  const subtotal = getCartAmount(); // total price before tax
  const tax = parseFloat((subtotal * 0.13).toFixed(2)); // 13% HST (hardcoded for Ontario)
  const total = subtotal + tax; // final total

  console.log("Cart Summary:", {
    subtotal,
    tax,
    total,
    itemCount: getCartCount(),
  });

  // -------------------- Input style helper --------------------
  const inputCls =
    "flex-grow w-full outline-none px-3 py-3 rounded-md text-blackhex placeholder-gray-500 " +
    "border border-gray-300 focus:border-primary focus:ring-2 focus:ring-secondary/40 " +
    "transition-colors";

  // -------------------- Render --------------------
  return (
    <div className="w-full md:w-96 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <h2 className="text-xl md:text-2xl font-semibold text-blackhex">
        Order <span className="text-primary">Summary</span>
      </h2>

      <hr className="border-gray-200 my-5" />

      <div className="space-y-6">
        {/* -------------------- Address Dropdown -------------------- */}
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
              {/* Chevron icon (rotates on open) */}
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

            {/* Dropdown options */}
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
                {/* Shortcut to add new address */}
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

        {/* -------------------- Promo Code (not wired yet) -------------------- */}
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

        {/* -------------------- Totals -------------------- */}
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

      {/* -------------------- Checkout Button -------------------- */}
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
