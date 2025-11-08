"use client";
// 👆 This tells Next.js this file is a client component (runs in the browser, not only on the server)

import React, { useEffect, useMemo, useState } from "react"; // React core features
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

const normaliseCartItems = (cartItems = {}) => {
  return Object.entries(cartItems)
    .map(([key, entry]) => {
      const isObj = typeof entry === "object" && entry !== null;
      const productId = isObj
        ? entry.productId
        : key.includes("-")
        ? key.split("-")[0]
        : key;
      const quantity = Number(
        isObj ? entry.quantity ?? 0 : entry ?? 0
      );

      if (!productId || quantity <= 0) {
        return null;
      }

      const baseItem = {
        productId,
        quantity,
      };

      if (isObj) {
        if (entry.format) baseItem.format = entry.format;
        if (entry.dimensions) baseItem.dimensions = entry.dimensions;
        if (entry.price != null) baseItem.price = Number(entry.price);
        if (entry.title) baseItem.title = entry.title;
        if (entry.imageUrl) baseItem.imageUrl = entry.imageUrl;
        if (entry.slug) baseItem.slug = entry.slug;
      } else {
        const [, format, dimensions] = key.split("-");
        if (format) baseItem.format = format;
        if (dimensions) baseItem.dimensions = dimensions;
      }

      return baseItem;
    })
    .filter(Boolean);
};

const buildPromoCart = (cartItems = {}, total = 0, shippingCost = 0) => ({
  items: normaliseCartItems(cartItems).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  })),
  totalPrice: Number(Number(total).toFixed(2)),
  shippingCost: Number(Number(shippingCost).toFixed(2)),
});

const promoCartSignatureFromPayload = (cartPayload) => {
  if (!cartPayload) return "";

  const itemsSignature = (cartPayload.items || [])
    .map((item) => `${item.productId || ""}:${item.quantity || 0}`)
    .sort()
    .join("|");

  const totalPrice = Number(cartPayload.totalPrice ?? 0).toFixed(2);
  const shippingCost = Number(cartPayload.shippingCost ?? 0).toFixed(2);

  return `${totalPrice}|${shippingCost}|${itemsSignature}`;
};

// -------------------- Checkout Button --------------------
const CheckoutButton = ({
  selectedAddress,
  cartItems,
  getToken,
  user,
  promoCode,
  promoResult,
}) => {
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
    const cartItemsArray = normaliseCartItems(cartItems);

    console.log("Cart Items (normalized):", cartItemsArray);

    // 🛑 Block if somehow nothing is left
    if (cartItemsArray.length === 0) {
      console.error("❌ Cart is empty after filtering");
      return toast.error("Your cart is empty");
    }

    const appliedPromoCode = promoResult?.valid
      ? promoResult.promoCode || promoCode || ""
      : promoCode || "";
    const trimmedPromoCode = appliedPromoCode.trim();

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
          ...(trimmedPromoCode ? { promoCode: trimmedPromoCode } : {}),
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
const OrderSummary = ({ shippingQuote: shippingOverride }) => {
  // 👇 Pull shared app state from your AppContext provider
  const {
    currency, // currency symbol e.g. "$"
    router, // Next.js router for navigation
    getCartCount, // function to count total cart items
    getCartAmount, // function to sum up subtotal
    getToken, // function to fetch Clerk JWT
    user, // logged-in user object (or null if guest)
    cartItems, // current cart contents
    shippingQuote: shippingQuoteFromContext,
    updateShippingQuote,
    resetShippingQuote,
  } = useAppContext();

  // Local state for this component only
  const [selectedAddress, setSelectedAddress] = useState(null); // which shipping address selected
  const [userAddresses, setUserAddresses] = useState([]); // all addresses saved to user
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // toggle address dropdown
  const [stripeReady, setStripeReady] = useState(null); // Stripe instance once loaded
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCartSignature, setPromoCartSignature] = useState(null);
  const [shippingError, setShippingError] = useState(null);

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
  const cartItemsArray = useMemo(() => normaliseCartItems(cartItems), [cartItems]);
  const hasPhysicalItems = useMemo(
    () =>
      cartItemsArray.some(
        (item) => String(item?.format || "physical").toLowerCase() !== "digital"
      ),
    [cartItemsArray]
  );

  const shippingQuote = shippingOverride ?? shippingQuoteFromContext;
  const shippingCurrency = shippingQuote?.currency || "usd";
  const normalizedShippingAmount = Number(shippingQuote?.amount ?? 0);
  const originalShippingAmount = Number.isFinite(normalizedShippingAmount)
    ? normalizedShippingAmount
    : 0;
  const effectiveShippingAmount =
    promoResult?.valid && promoResult.promoType === "shipping"
      ? 0
      : originalShippingAmount;
  const totalBeforeDiscount = subtotal + tax + effectiveShippingAmount;

  const promoCartPayload = useMemo(
    () => buildPromoCart(cartItems, subtotal + tax, originalShippingAmount),
    [cartItems, subtotal, tax, originalShippingAmount]
  );

  const rawDiscountAmount = promoResult?.valid
    ? Number(promoResult.discount ?? 0)
    : 0;
  const discountAmount = Number.isFinite(rawDiscountAmount)
    ? rawDiscountAmount
    : 0;
  const rawPayableTotal = promoResult?.valid
    ? Number(promoResult.newTotal ?? totalBeforeDiscount)
    : totalBeforeDiscount;
  const payableTotal = Number.isFinite(rawPayableTotal)
    ? rawPayableTotal
    : totalBeforeDiscount;

  const isSameAppliedCode = Boolean(
    promoResult?.valid &&
      promoCode.trim().toLowerCase() ===
        (promoResult.promoCode || "").toLowerCase()
  );

  console.log("Cart Summary:", {
    subtotal,
    tax,
    shipping: effectiveShippingAmount,
    total: totalBeforeDiscount,
    itemCount: getCartCount(),
  });

  useEffect(() => {
    if (cartItemsArray.length === 0) {
      setPromoResult(null);
      setPromoCode("");
      setPromoCartSignature(null);
    }
  }, [cartItemsArray.length]);

  useEffect(() => {
    let ignore = false;

    const fetchShippingQuote = async () => {
      if (!user || !selectedAddress?._id) {
        resetShippingQuote();
        setShippingError(null);
        return;
      }

      if (!cartItemsArray.length || !hasPhysicalItems) {
        updateShippingQuote({ amount: 0, currency: shippingCurrency });
        setShippingError(null);
        return;
      }

      try {
        const token = await getToken();
        const { data } = await axios.post(
          "/api/printful/shipping",
          {
            addressId: selectedAddress._id,
            items: cartItemsArray.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              format: item.format,
              dimensions: item.dimensions,
            })),
            cheapestOnly: true,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (ignore) return;

        if (data?.success) {
          const [rate] = Array.isArray(data.rates) ? data.rates : [];
          if (rate) {
            updateShippingQuote({
              amount: rate.rate ?? rate.amount ?? 0,
              currency: rate.currency || shippingCurrency,
              name: rate.name,
              id: rate.id,
            });
            setShippingError(null);
          } else {
            updateShippingQuote({ amount: 0, currency: shippingCurrency });
            setShippingError(null);
          }
        } else {
          const message = data?.message || "Unable to calculate shipping";
          setShippingError(message);
          toast.error(message);
          updateShippingQuote({ amount: 0, currency: shippingCurrency });
        }
      } catch (error) {
        if (ignore) return;
        const message =
          error?.response?.data?.message || error.message || "Unable to calculate shipping";
        setShippingError(message);
        toast.error(message);
        updateShippingQuote({ amount: 0, currency: shippingCurrency });
      }
    };

    fetchShippingQuote();

    return () => {
      ignore = true;
    };
  }, [
    user,
    selectedAddress?._id,
    cartItemsArray,
    hasPhysicalItems,
    getToken,
    updateShippingQuote,
    resetShippingQuote,
    shippingCurrency,
  ]);

  useEffect(() => {
    if (!promoResult?.valid) return;

    const currentSignature = promoCartSignatureFromPayload(promoCartPayload);
    if (
      promoCartSignature &&
      promoCartSignature !== currentSignature
    ) {
      setPromoResult(null);
      setPromoCartSignature(null);
    }
  }, [promoCartPayload, promoCartSignature, promoResult?.valid]);

  const handlePromoInputChange = (event) => {
    const value = event.target.value;
    setPromoCode(value);

    if (
      promoResult &&
      value.trim().toLowerCase() !==
        (promoResult.promoCode || "").toLowerCase()
    ) {
      setPromoResult(null);
      setPromoCartSignature(null);
    }
  };

  const handleApplyPromo = async () => {
    const trimmedCode = promoCode.trim();

    if (!trimmedCode) {
      toast.error("Please enter a promo code");
      return;
    }

    if (cartItemsArray.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      setIsApplyingPromo(true);
      const { data } = await axios.post("/api/promo/validate", {
        code: trimmedCode,
        cart: promoCartPayload,
      });

      if (data?.valid) {
        setPromoResult(data);
        setPromoCode(data.promoCode || trimmedCode);
        setPromoCartSignature(
          promoCartSignatureFromPayload(promoCartPayload)
        );
        toast.success(data?.message || "Promo applied");
      } else {
        setPromoResult({ ...data, promoCode: trimmedCode });
        setPromoCartSignature(null);
        toast.error(data?.message || "Promo code not valid");
      }
    } catch (error) {
      console.error("❌ Promo apply error:", error);
      setPromoResult(null);
      setPromoCartSignature(null);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to apply promo"
      );
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoResult(null);
    setPromoCode("");
    setPromoCartSignature(null);
  };

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
          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Enter promo code"
                className={inputCls}
                value={promoCode}
                onChange={handlePromoInputChange}
                disabled={isApplyingPromo}
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="h-10 px-6 rounded-full font-semibold text-white bg-primary hover:bg-tertiary active:scale-[0.99] shadow-md shadow-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  isApplyingPromo || cartItemsArray.length === 0 || isSameAppliedCode
                }
              >
                {isApplyingPromo ? "Applying..." : "Apply"}
              </button>
            </div>
            {promoResult?.valid && (
              <button
                type="button"
                onClick={handleRemovePromo}
                className="text-sm font-medium text-primary hover:underline"
              >
                Remove code
              </button>
            )}
            {promoResult && (
              <p
                className={`text-sm ${
                  promoResult.valid ? "text-green-600" : "text-red-500"
                }`}
              >
                {promoResult.message ||
                  (promoResult.valid
                    ? "Promo applied"
                    : "Promo code not valid")}
              </p>
            )}
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
            <p className="font-medium text-blackhex">
              {effectiveShippingAmount > 0
                ? `${currency}${effectiveShippingAmount.toFixed(2)}`
                : "Free"}
            </p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (13%)</p>
            <p className="font-medium text-blackhex">
              {currency}
              {tax.toFixed(2)}
            </p>
          </div>
          {promoResult?.valid && discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <p className="text-gray-600">Promo Discount</p>
              <p className="font-medium">
                -{currency}
                {discountAmount.toFixed(2)}
              </p>
            </div>
          )}
          <div className="flex justify-between text-lg md:text-xl font-semibold border-t border-gray-200 pt-3">
            <p className="text-blackhex">Total</p>
            <p className="text-blackhex">
              {currency}
              {payableTotal.toFixed(2)}
            </p>
          </div>
          {shippingError && (
            <p className="text-sm text-red-500">{shippingError}</p>
          )}
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
              promoCode={promoCode}
              promoResult={promoResult}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
