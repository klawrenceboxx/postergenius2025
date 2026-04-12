"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { useAppContext } from "@/context/AppContext";
import { hasRequiredGuestCheckoutDetails } from "@/lib/guestCheckout";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const inputCls =
  "flex-grow w-full rounded-2xl border border-stone-300 px-4 py-3 text-blackhex outline-none " +
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
    lineTotal: Number(
      (Number(item.price ?? 0) * Number(item.quantity ?? 0)).toFixed(2)
    ),
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

export default function GuestCheckoutSummary({
  shippingQuote: shippingOverride,
  guestAddress = null,
  guestId = null,
  guestCheckoutState = null,
}) {
  const {
    currency,
    getCartAmount,
    getToken,
    router,
    user,
    cartItems,
    products,
    ensureGuestId,
    shippingQuote: shippingQuoteFromContext,
    updateShippingQuote,
    resetShippingQuote,
  } = useAppContext();

  const [stripeClient, setStripeClient] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [promoCartSignature, setPromoCartSignature] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [shippingError, setShippingError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const cartItemsArray = useMemo(() => normaliseCartItems(cartItems), [cartItems]);
  const hasPhysicalItems = useMemo(
    () =>
      cartItemsArray.some(
        (item) => String(item?.format || "physical").toLowerCase() !== "digital"
      ),
    [cartItemsArray]
  );
  const guestCheckoutReady =
    guestCheckoutState?.ready ?? hasRequiredGuestCheckoutDetails(guestAddress);

  const cartItemPreviews = useMemo(
    () =>
      cartItemsArray.map((item) => {
        const product = products.find(
          (candidate) =>
            (candidate.productId || candidate._id?.toString?.() || candidate._id) ===
            item.productId
        );

        return {
          key: `${item.productId}-${item.format || "physical"}-${item.dimensions || ""}`,
          name: product?.name || "PosterGenius Poster",
          imageUrl:
            product?.imageUrl ||
            product?.image?.[0] ||
            product?.images?.[0] ||
            "",
          quantity: item.quantity,
          format: item.format || "physical",
          dimensions: item.dimensions || "",
          unitPrice: Number(item.price ?? 0),
        };
      }),
    [cartItemsArray, products]
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

  const normalizedSubtotal = Number(getCartAmount().toFixed(2));
  const tax = parseFloat((normalizedSubtotal * 0.13).toFixed(2));
  const shippingQuote = shippingOverride ?? shippingQuoteFromContext;
  const originalShippingAmount = Number.isFinite(Number(shippingQuote?.amount ?? 0))
    ? Number(shippingQuote?.amount ?? 0)
    : 0;
  const effectiveShippingAmount =
    promoResult?.valid && promoResult.promoType === "shipping"
      ? 0
      : originalShippingAmount;
  const totalBeforeDiscount = normalizedSubtotal + tax + effectiveShippingAmount;
  const payableTotal = promoResult?.valid
    ? Number(promoResult.newTotal ?? totalBeforeDiscount) || totalBeforeDiscount
    : totalBeforeDiscount;
  const discountAmount = promoResult?.valid
    ? Number(promoResult.discount ?? 0) || 0
    : 0;

  const promoCartPayload = useMemo(
    () => buildPromoCart(cartItems, normalizedSubtotal + tax, originalShippingAmount),
    [cartItems, normalizedSubtotal, originalShippingAmount, tax]
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

      if (!user && !guestCheckoutReady) {
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
    guestCheckoutReady,
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
    if (!stripeClient) {
      toast.error("Stripe is still loading. Please try again.");
      return;
    }

    if (!cartItemsArray.length) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user) {
      const persistedGuestDetails = await guestCheckoutState?.saveGuestDetails?.({
        showSuccessToast: false,
        focusOnError: true,
      });

      if (!persistedGuestDetails?.success) {
        guestCheckoutState?.onRequireGuestDetails?.();
        return;
      }
    }

    if (hasPhysicalItems && user && !selectedAddress?._id) {
      toast.error("Please select a shipping address.");
      return;
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

      if (!data?.success || !data?.sessionId) {
        toast.error(data?.message || "Unable to start checkout");
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
    <div className="w-full rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-blackhex">
            Order summary
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Review the order, then move into secure Stripe checkout.
          </p>
        </div>
        <p className="text-sm font-medium text-stone-500">
          {cartItemPreviews.length} {cartItemPreviews.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {cartItemPreviews.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-[24px] border border-stone-200 bg-[#fcfaf7] p-3"
          >
            <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white">
              {item.imageUrl ? (
                <Image
                  {...getOptimizedImageProps(item.imageUrl, {
                    variant: "thumbnail",
                  })}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  width={96}
                  height={120}
                />
              ) : (
                <span className="text-xs text-stone-400">Poster</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-blackhex">{item.name}</p>
              <p className="mt-1 text-sm text-stone-600">
                Qty {item.quantity} •{" "}
                {item.format === "digital" ? "Digital download" : "Physical poster"}
                {item.dimensions && item.dimensions !== "digital"
                  ? ` • ${item.dimensions}`
                  : ""}
              </p>
            </div>
            <div className="text-right text-sm font-semibold text-blackhex">
              {currency}
              {(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <hr className="my-6 border-stone-200" />

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium uppercase text-blackhex">
            {user ? "Select Address" : "Guest Checkout"}
          </label>

          {user ? (
            <div className="relative text-sm">
              <button
                type="button"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 pr-10 text-left text-blackhex transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40"
                onClick={() => setIsDropdownOpen((open) => !open)}
              >
                <span className="block truncate">
                  {selectedAddress
                    ? `${selectedAddress.fullName}, ${selectedAddress.area}, ${selectedAddress.city}, ${selectedAddress.state}`
                    : "Select address"}
                </span>
              </button>

              {isDropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full rounded-2xl border border-stone-200 bg-white py-1.5 shadow-lg">
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
            <div className="rounded-[24px] border border-stone-200 bg-[#fcfaf7] px-4 py-4 text-sm text-stone-700">
              <p className="font-semibold text-blackhex">
                {guestCheckoutReady
                  ? "Guest checkout details are ready."
                  : "Guest checkout details are incomplete."}
              </p>
              <p className="mt-2 leading-6">
                {guestCheckoutReady
                  ? `${guestAddress.fullName}, ${guestAddress.street}, ${guestAddress.city}, ${guestAddress.province}`
                  : "Fill in your full contact and delivery details, then accept the terms to unlock payment."}
              </p>
              {!guestCheckoutReady ? (
                <button
                  type="button"
                  onClick={() => guestCheckoutState?.onRequireGuestDetails?.()}
                  className="mt-3 text-sm font-semibold text-primary hover:underline"
                >
                  Complete guest details
                </button>
              ) : null}
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

        <div className="space-y-2 rounded-[24px] border border-stone-200 bg-white p-4">
          <div className="flex justify-between text-base font-medium">
            <p className="uppercase text-gray-600">Items</p>
            <p className="text-blackhex">
              {currency}
              {normalizedSubtotal.toFixed(2)}
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
          {promoResult?.valid && discountAmount > 0 ? (
            <div className="flex justify-between text-red-600">
              <p className="text-gray-600">Promo Discount</p>
              <p className="font-medium">
                -{currency}
                {discountAmount.toFixed(2)}
              </p>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-semibold">
            <p className="text-blackhex">Order total</p>
            <p className="text-blackhex">
              {currency}
              {payableTotal.toFixed(2)}
            </p>
          </div>
          {shippingError ? <p className="text-sm text-red-500">{shippingError}</p> : null}
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={startCheckout}
          disabled={checkoutLoading || (!user && !guestCheckoutReady)}
          className="h-12 w-full rounded-full bg-primary font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkoutLoading
            ? "Processing..."
            : !user && !guestCheckoutReady
            ? "Complete guest details"
            : "Checkout"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-stone-500">
          Secure payment handled by Stripe. Guest buyers can retrieve orders any
          time from Track Order using email plus order number.
        </p>
      </div>
    </div>
  );
}
