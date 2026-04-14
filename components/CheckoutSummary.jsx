"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { useAppContext } from "@/context/AppContext";

const inputCls =
  "flex-grow w-full rounded-md border border-gray-300 px-3 py-3 text-blackhex outline-none " +
  "transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40";

const normaliseCartItems = (cartItems = {}) =>
  Object.entries(cartItems)
    .map(([key, entry]) => {
      const isObjectEntry = typeof entry === "object" && entry !== null;
      const productId = isObjectEntry
        ? entry.productId
        : key.includes("-")
        ? key.split("-")[0]
        : key;
      const quantity = Number(isObjectEntry ? entry.quantity ?? 0 : entry ?? 0);

      if (!productId || quantity <= 0) return null;

      const normalized = { productId, quantity };
      if (isObjectEntry) {
        if (entry.format) normalized.format = entry.format;
        if (entry.dimensions) normalized.dimensions = entry.dimensions;
        if (entry.price != null) normalized.price = Number(entry.price);
      } else {
        const [, format, dimensions] = key.split("-");
        if (format) normalized.format = format;
        if (dimensions) normalized.dimensions = dimensions;
      }

      return normalized;
    })
    .filter(Boolean);

const buildPromoCart = (cartItems = {}, total = 0, shippingCost = 0) => ({
  items: normaliseCartItems(cartItems).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    format: item.format || "physical",
    price: Number(item.price ?? 0),
    lineTotal: Number((Number(item.price ?? 0) * Number(item.quantity ?? 0)).toFixed(2)),
  })),
  totalPrice: Number(Number(total).toFixed(2)),
  shippingCost: Number(Number(shippingCost).toFixed(2)),
});

const promoSignature = (cartPayload) => {
  const itemsSignature = (cartPayload?.items || [])
    .map((item) => `${item.productId || ""}:${item.quantity || 0}`)
    .sort()
    .join("|");

  return `${Number(cartPayload?.totalPrice ?? 0).toFixed(2)}|${Number(
    cartPayload?.shippingCost ?? 0
  ).toFixed(2)}|${itemsSignature}`;
};

const hasGuestAddressDetails = (guestAddress) =>
  Boolean(
    guestAddress &&
      [
        guestAddress.fullName,
        guestAddress.email,
        guestAddress.phone,
        guestAddress.street,
        guestAddress.city,
        guestAddress.postalCode,
        guestAddress.country,
        guestAddress.province,
      ].every(Boolean)
  );

export default function CheckoutSummary({
  shippingQuote: shippingOverride,
  guestAddress = null,
  guestId = null,
  allowGuestCheckout = false,
}) {
  const {
    currency,
    router,
    getCartCount,
    getCartAmount,
    getToken,
    user,
    cartItems,
    ensureGuestId,
    shippingQuote: shippingQuoteFromContext,
    updateShippingQuote,
    resetShippingQuote,
  } = useAppContext();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stripeClient, setStripeClient] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [promoCartSignature, setPromoCartSignature] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [shippingError, setShippingError] = useState(null);

  const cartItemsArray = useMemo(() => normaliseCartItems(cartItems), [cartItems]);
  const hasPhysicalItems = useMemo(
    () =>
      cartItemsArray.some(
        (item) => String(item?.format || "physical").toLowerCase() !== "digital"
      ),
    [cartItemsArray]
  );
  const guestHasAddress = useMemo(
    () => hasGuestAddressDetails(guestAddress),
    [guestAddress]
  );

  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).then(setStripeClient);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserAddresses([]);
      setSelectedAddress(null);
      return;
    }

    let ignore = false;

    const fetchUserAddresses = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/user/get-address", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (ignore) return;

        if (data.success) {
          setUserAddresses(data.addresses || []);
          setSelectedAddress((current) => current || data.addresses?.[0] || null);
        } else {
          toast.error(data.message || "Unable to fetch addresses");
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error?.response?.data?.message || error.message || "Error");
        }
      }
    };

    fetchUserAddresses();

    return () => {
      ignore = true;
    };
  }, [getToken, user]);

  const subtotal = getCartAmount();
  const tax = parseFloat((subtotal * 0.13).toFixed(2));
  const shippingQuote = shippingOverride ?? shippingQuoteFromContext;
  const originalShippingAmount = Number.isFinite(Number(shippingQuote?.amount ?? 0))
    ? Number(shippingQuote?.amount ?? 0)
    : 0;
  const effectiveShippingAmount =
    promoResult?.valid && promoResult.promoType === "shipping"
      ? 0
      : originalShippingAmount;
  const totalBeforeDiscount = subtotal + tax + effectiveShippingAmount;
  const payableTotal = promoResult?.valid
    ? Number(promoResult.newTotal ?? totalBeforeDiscount) || totalBeforeDiscount
    : totalBeforeDiscount;
  const discountAmount = promoResult?.valid
    ? Number(promoResult.discount ?? 0) || 0
    : 0;
  const promoCartPayload = useMemo(
    () => buildPromoCart(cartItems, subtotal + tax, originalShippingAmount),
    [cartItems, subtotal, tax, originalShippingAmount]
  );

  useEffect(() => {
    if (!promoResult?.valid) return;

    const nextSignature = promoSignature(promoCartPayload);
    if (promoCartSignature && promoCartSignature !== nextSignature) {
      setPromoResult(null);
      setPromoCartSignature("");
    }
  }, [promoCartPayload, promoCartSignature, promoResult?.valid]);

  useEffect(() => {
    let ignore = false;

    const fetchShipping = async () => {
      if (!cartItemsArray.length || !hasPhysicalItems) {
        updateShippingQuote({ amount: 0, currency: "usd" });
        setShippingError(null);
        return;
      }

      if (user && !selectedAddress?._id) {
        resetShippingQuote();
        setShippingError(null);
        return;
      }

      if (!user && !guestHasAddress) {
        resetShippingQuote();
        setShippingError(null);
        return;
      }

      try {
        const headers = {};
        if (user) {
          const token = await getToken();
          headers.Authorization = `Bearer ${token}`;
        } else if (guestId) {
          headers["x-guest-id"] = guestId;
        }

        const { data } = await axios.post(
          "/api/printful/shipping",
          {
            items: cartItemsArray,
            cheapestOnly: true,
            ...(user
              ? { addressId: selectedAddress?._id }
              : { address: guestAddress, guestId }),
          },
          { headers }
        );

        if (ignore) return;

        if (data?.success) {
          const [rate] = Array.isArray(data.rates) ? data.rates : [];
          updateShippingQuote(
            rate
              ? {
                  amount: rate.rate ?? rate.amount ?? 0,
                  currency: rate.currency || "usd",
                  name: rate.name,
                  id: rate.id,
                }
              : { amount: 0, currency: "usd" }
          );
          setShippingError(null);
        } else {
          setShippingError(data?.message || "Unable to calculate shipping");
          updateShippingQuote({ amount: 0, currency: "usd" });
        }
      } catch (error) {
        if (ignore) return;
        setShippingError(
          error?.response?.data?.message || error.message || "Unable to calculate shipping"
        );
        updateShippingQuote({ amount: 0, currency: "usd" });
      }
    };

    fetchShipping();

    return () => {
      ignore = true;
    };
  }, [
    cartItemsArray,
    getToken,
    guestAddress,
    guestHasAddress,
    guestId,
    hasPhysicalItems,
    resetShippingQuote,
    selectedAddress?._id,
    updateShippingQuote,
    user,
  ]);

  const applyPromo = async () => {
    const trimmedCode = promoCode.trim();
    if (!trimmedCode) {
      toast.error("Please enter a promo code");
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
        setPromoCartSignature(promoSignature(promoCartPayload));
        toast.success(data.message || "Promo applied");
      } else {
        setPromoResult({ ...data, promoCode: trimmedCode });
        setPromoCartSignature("");
        toast.error(data?.message || "Promo code not valid");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Failed to apply promo"
      );
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const startCheckout = async () => {
    if (!cartItemsArray.length) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user && !allowGuestCheckout) {
      router.push("/checkout");
      return;
    }

    if (hasPhysicalItems) {
      if (user && !selectedAddress?._id) {
        toast.error("Please select a shipping address.");
        return;
      }

      if (!user && !guestHasAddress) {
        toast.error("Please save your guest address before checkout.");
        return;
      }
    }

    try {
      setCheckoutLoading(true);

      const headers = {};
      let activeGuestId = guestId;
      if (user) {
        const token = await getToken();
        headers.Authorization = `Bearer ${token}`;
      } else {
        activeGuestId = guestId || (await ensureGuestId());
        if (!activeGuestId) {
          toast.error("Unable to create guest session. Please refresh and try again.");
          return;
        }
        headers["x-guest-id"] = activeGuestId;
      }

      const trimmedPromoCode = (promoResult?.valid
        ? promoResult.promoCode || promoCode
        : promoCode
      ).trim();

      const customerEmail = user
        ? user?.primaryEmailAddress?.emailAddress || ""
        : guestAddress?.email || "";

      const { data } = await axios.post(
        "/api/stripe/create-session",
        {
          items: cartItemsArray,
          ...(user ? { address: selectedAddress?._id } : { guestId: activeGuestId }),
          successUrl: `${window.location.origin}/my-orders`,
          cancelUrl: `${window.location.origin}/cart`,
          ...(trimmedPromoCode ? { promoCode: trimmedPromoCode } : {}),
          ...(customerEmail ? { customerEmail } : {}),
        },
        { headers }
      );

      if (!data?.success || (!data?.sessionId && !data?.url)) {
        toast.error(data?.message || "Unable to start checkout");
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      if (!stripeClient) {
        toast.error("Unable to load Stripe checkout");
        return;
      }

      const { error } = await stripeClient.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        toast.error(error.message || "Failed to redirect to checkout");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Unable to start checkout"
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:w-96">
      <h2 className="text-xl font-semibold text-blackhex md:text-2xl">
        Order <span className="text-primary">Summary</span>
      </h2>

      <hr className="my-5 border-gray-200" />

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium uppercase text-blackhex">
            {user ? "Select Address" : "Guest Checkout"}
          </label>

          {user ? (
            <div className="relative text-sm">
              <button
                type="button"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-10 text-left text-blackhex transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40"
                onClick={() => setIsDropdownOpen((open) => !open)}
              >
                <span className="block truncate">
                  {selectedAddress
                    ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state}`
                    : "Select address"}
                </span>
              </button>

              {isDropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1.5 shadow-lg">
                  {userAddresses.map((address) => (
                    <li
                      key={address._id}
                      className="cursor-pointer px-4 py-2 hover:bg-secondary/10"
                      onClick={() => {
                        setSelectedAddress(address);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {address.fullName}, {address.area}, {address.city}, {address.state}
                    </li>
                  ))}
                  <li
                    className="cursor-pointer px-4 py-2 text-center text-primary hover:bg-secondary/10"
                    onClick={() => router.push("/add-address")}
                  >
                    + Add New Address
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="font-medium text-blackhex">
                {guestHasAddress ? "Guest checkout is ready." : "Add your address to continue."}
              </p>
              <p className="mt-1">
                {guestHasAddress
                  ? `${guestAddress.fullName}, ${guestAddress.street}, ${guestAddress.city}, ${guestAddress.province}`
                  : "We need your name, email, address, and phone number before checkout."}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium uppercase text-blackhex">
            Promo Code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Enter promo code"
              className={inputCls}
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              disabled={isApplyingPromo}
            />
            <button
              type="button"
              onClick={applyPromo}
              disabled={isApplyingPromo}
              className="h-10 rounded-full bg-primary px-6 font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingPromo ? "Applying..." : "Apply"}
            </button>
          </div>

          {promoResult?.valid && (
            <button
              type="button"
              onClick={() => {
                setPromoResult(null);
                setPromoCode("");
                setPromoCartSignature("");
              }}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Remove code
            </button>
          )}

          {promoResult && (
            <p
              className={`mt-2 text-sm ${
                promoResult.valid ? "text-green-600" : "text-red-500"
              }`}
            >
              {promoResult.message ||
                (promoResult.valid ? "Promo applied" : "Promo code not valid")}
            </p>
          )}
        </div>

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
          <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-semibold md:text-xl">
            <p className="text-blackhex">Total</p>
            <p className="text-blackhex">
              {currency}
              {payableTotal.toFixed(2)}
            </p>
          </div>
          {shippingError && <p className="text-sm text-red-500">{shippingError}</p>}
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={startCheckout}
          disabled={checkoutLoading}
          className="h-12 w-full rounded-full bg-primary font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkoutLoading
            ? "Processing..."
            : !user && !allowGuestCheckout
            ? "Continue to Checkout"
            : "Checkout"}
        </button>
      </div>
    </div>
  );
}
