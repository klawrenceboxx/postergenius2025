"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrderSummary from "@/components/OrderSummary";
import { useAppContext } from "@/context/AppContext";

export const metadata = {
  title: "Checkout | PosterGenius",
  description:
    "Complete your PosterGenius order with secure guest checkout, saved addresses, and a detailed order summary.",
  alternates: { canonical: "https://postergenius.ca/checkout" },
  openGraph: {
    title: "Checkout | PosterGenius",
    description:
      "Complete your PosterGenius order with secure guest checkout, saved addresses, and a detailed order summary.",
    url: "https://postergenius.ca/checkout",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkout | PosterGenius",
    description:
      "Complete your PosterGenius order with secure guest checkout, saved addresses, and a detailed order summary.",
  },
};

const EMPTY_GUEST_ADDRESS = {
  fullName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  postalCode: "",
  country: "",
  province: "",
};

const inputCls =
  "px-3 py-3 rounded-md w-full text-blackhex placeholder-gray-500 " +
  "border border-gray-300 focus:border-primary focus:ring-2 focus:ring-secondary/40 outline-none " +
  "transition-colors duration-200";

const fieldOrder = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
  },
  {
    name: "phone",
    label: "Phone number",
    type: "tel",
    autoComplete: "tel",
  },
  {
    name: "street",
    label: "Street address",
    type: "text",
    autoComplete: "street-address",
  },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2" },
  {
    name: "province",
    label: "Province / State",
    type: "text",
    autoComplete: "address-level1",
  },
  {
    name: "postalCode",
    label: "Postal code",
    type: "text",
    autoComplete: "postal-code",
  },
  { name: "country", label: "Country", type: "text", autoComplete: "country" },
];

const CheckoutPage = () => {
  const { user, ensureGuestId, fetchGuestAddress, fetchCart, router } =
    useAppContext();
  const [formValues, setFormValues] = useState(EMPTY_GUEST_ADDRESS);
  const [guestId, setGuestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (user) return;

    let ignore = false;

    const prefillGuestAddress = async () => {
      setIsPrefilling(true);
      const result = await fetchGuestAddress({ createGuestIfMissing: true });
      if (ignore) return;

      if (result?.guestId) {
        setGuestId(result.guestId);
      }

      if (result?.address) {
        setFormValues((prev) => ({
          ...prev,
          ...fieldOrder.reduce((acc, field) => {
            if (result.address[field.name]) {
              acc[field.name] = result.address[field.name];
            }
            return acc;
          }, {}),
        }));
      }

      setIsPrefilling(false);
    };

    prefillGuestAddress();

    return () => {
      ignore = true;
    };
  }, [user, fetchGuestAddress]);

  const isFormDisabled = useMemo(() => user != null, [user]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (user) {
      toast.success("You are signed in. Manage addresses from your account.");
      return;
    }

    try {
      setIsSubmitting(true);
      const activeGuestId = guestId || (await ensureGuestId());

      if (!activeGuestId) {
        toast.error("Unable to create guest session. Please refresh and try again.");
        return;
      }

      const { data } = await axios.post("/api/guest/save-address", {
        guestId: activeGuestId,
        addressData: formValues,
      });

      if (data?.success) {
        setGuestId(activeGuestId);
        if (data.address) {
          setFormValues((prev) => ({
            ...prev,
            ...fieldOrder.reduce((acc, field) => {
              if (data.address[field.name]) {
                acc[field.name] = data.address[field.name];
              }
              return acc;
            }, {}),
          }));
        }
        toast.success("Address saved for guest checkout");
      } else {
        toast.error(data?.message || "Failed to save address");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Failed to save address"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (user) {
      toast.error("Please use the standard checkout when signed in.");
      return;
    }

    try {
      setIsPlacingOrder(true);

      const activeGuestId = guestId || (await ensureGuestId());
      if (!activeGuestId) {
        toast.error(
          "Unable to create guest session. Please refresh and try again."
        );
        return;
      }

      const headers = { "x-guest-id": activeGuestId };

      if (!guestId) {
        setGuestId(activeGuestId);
      }

      const [cartResponse, addressResponse] = await Promise.all([
        axios.get("/api/cart/get", { headers }),
        axios.get("/api/guest/get-address", { headers }),
      ]);

      if (!cartResponse?.data?.success) {
        toast.error(cartResponse?.data?.message || "Failed to load cart items");
        return;
      }

      if (!addressResponse?.data?.success) {
        toast.error(
          addressResponse?.data?.message || "Failed to load shipping address"
        );
        return;
      }

      const cartItems = cartResponse.data.cartItems || {};
      if (Object.keys(cartItems).length === 0) {
        toast.error("Your cart is empty. Add items before placing an order.");
        return;
      }

      const shippingAddress = addressResponse.data.address;
      if (!shippingAddress) {
        toast.error("Please save your shipping address before placing an order.");
        return;
      }

      const totalPrice = Object.values(cartItems).reduce((sum, item) => {
        if (!item || typeof item !== "object") return sum;
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
          return sum;
        }
        return sum + quantity * price;
      }, 0);

      const payload = {
        guestId: activeGuestId,
        cartItems,
        shippingAddress,
        totalPrice: Math.round(totalPrice * 100) / 100,
        shippingPrice: 0,
        taxPrice: 0,
      };

      const { data } = await axios.post("/api/order/create", payload, {
        headers,
      });

      if (data?.success) {
        toast.success("Order placed successfully!");
        await fetchCart({ createGuestIfMissing: false });
        if (router?.push) {
          router.push("/order-success");
        }
      } else {
        toast.error(data?.message || "Failed to place order");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to place order"
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-32 py-12 flex flex-col-reverse lg:flex-row gap-12">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-blackhex mb-6">
            Checkout <span className="text-primary">| PosterGenius</span>
          </h1>
          {user ? (
            <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-6 text-blackhex">
              <p className="font-medium">You are currently signed in.</p>
              <p className="text-sm text-gray-600 mt-2">
                Please use your saved addresses from the checkout summary or manage them on
                the Add Address page.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {fieldOrder.map(({ name, label, type, autoComplete }) => (
                <div key={name} className="flex flex-col gap-2">
                  <label htmlFor={name} className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <input
                    id={name}
                    name={name}
                    type={type}
                    autoComplete={autoComplete}
                    className={inputCls}
                    value={formValues[name]}
                    onChange={handleChange(name)}
                    disabled={isSubmitting || isPrefilling || isFormDisabled}
                    required
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={isSubmitting || isPrefilling}
                className="w-full h-12 rounded-full font-semibold text-white bg-primary hover:bg-tertiary active:scale-[0.99] shadow-md shadow-primary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save guest address"}
              </button>
              <p className="text-xs text-gray-500">
                Your contact details are only used to fulfill this order. We will remember them
                for this browser session using your guest ID.
              </p>
            </form>
          )}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || isPrefilling || isPlacingOrder}
            className="mt-6 w-full h-12 rounded-full font-semibold text-white bg-secondary hover:bg-tertiary active:scale-[0.99] shadow-md shadow-secondary/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPlacingOrder ? "Placing order..." : "Place Order"}
          </button>
        </div>
        <div className="w-full lg:max-w-md">
          <OrderSummary />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CheckoutPage;
