"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuestCheckoutSummary from "@/components/GuestCheckoutSummary";
import { useAppContext } from "@/context/AppContext";
import { validateGuestCheckoutDetails } from "@/lib/guestCheckout";

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
  "px-4 py-3 rounded-2xl w-full text-blackhex placeholder-gray-400 " +
  "border border-stone-300 bg-white focus:border-primary focus:ring-2 focus:ring-secondary/30 outline-none " +
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
  {
    name: "country",
    label: "Country",
    type: "text",
    autoComplete: "country-name",
  },
];

export default function CheckoutPage() {
  const { user, ensureGuestId, fetchGuestAddress, shippingQuote } = useAppContext();
  const [formValues, setFormValues] = useState(EMPTY_GUEST_ADDRESS);
  const [guestId, setGuestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const guestFormRef = useRef(null);

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

  const validationErrors = useMemo(
    () =>
      validateGuestCheckoutDetails(formValues, {
        acceptPolicies,
        requirePolicies: true,
      }),
    [acceptPolicies, formValues]
  );

  const guestCheckoutReady = Object.keys(validationErrors).length === 0;

  const focusGuestForm = () => {
    guestFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const persistGuestAddress = async ({
    showSuccessToast = false,
    focusOnError = true,
  } = {}) => {
    if (user) {
      return { success: true, guestId: null, address: null };
    }

    const nextErrors = validateGuestCheckoutDetails(formValues, {
      acceptPolicies,
      requirePolicies: true,
    });

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (focusOnError) {
        focusGuestForm();
      }
      toast.error("Complete the required guest checkout details before payment.");
      return { success: false, errors: nextErrors };
    }

    try {
      setIsSubmitting(true);
      const activeGuestId = guestId || (await ensureGuestId());

      if (!activeGuestId) {
        toast.error("Unable to create guest session. Please refresh and try again.");
        return { success: false };
      }

      const { data } = await axios.post("/api/guest/save-address", {
        guestId: activeGuestId,
        addressData: formValues,
      });

      if (!data?.success) {
        toast.error(data?.message || "Failed to save checkout details");
        return { success: false };
      }

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

      if (showSuccessToast) {
        toast.success("Guest checkout details saved");
      }

      return { success: true, guestId: activeGuestId, address: data.address };
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to save checkout details"
      );
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (user) {
      toast.success("You are signed in. Manage addresses from your account.");
      return;
    }

    await persistGuestAddress({ showSuccessToast: true, focusOnError: true });
  };

  return (
    <>
      <Navbar />
      <main className="bg-[#fcfaf7] px-6 py-10 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <section ref={guestFormRef} className="min-w-0">
            <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
              <div className="inline-flex rounded-full bg-[#f5ecff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-secondary">
                Secure checkout
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-blackhex">
                Checkout
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                Guest orders now require full contact and delivery details before
                payment. This is what powers your confirmation email, guest order
                lookup, download access, and shipping updates.
              </p>

              {user ? (
                <div className="mt-8 rounded-[28px] border border-secondary/20 bg-secondary/5 p-6 text-blackhex">
                  <p className="font-semibold">You are currently signed in.</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Use your saved addresses from the order summary, or manage them
                    on the{" "}
                    <Link href="/add-address" className="font-semibold text-primary">
                      address page
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                  <div>
                    <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4">
                      <div>
                        <h2 className="text-2xl font-bold tracking-[-0.03em] text-blackhex">
                          Contact and delivery details
                        </h2>
                        <p className="mt-2 text-sm text-stone-600">
                          Required for all guest orders, including digital downloads.
                        </p>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                        All fields required
                      </p>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {fieldOrder.map(({ name, label, type, autoComplete }) => (
                        <div
                          key={name}
                          className={name === "street" ? "md:col-span-2" : ""}
                        >
                          <label
                            htmlFor={name}
                            className="mb-2 block text-sm font-semibold text-stone-800"
                          >
                            {label} <span className="text-primary">*</span>
                          </label>
                          <input
                            id={name}
                            name={name}
                            type={type}
                            autoComplete={autoComplete}
                            className={`${inputCls} ${
                              fieldErrors[name]
                                ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                                : ""
                            }`}
                            value={formValues[name]}
                            onChange={handleChange(name)}
                            disabled={isSubmitting || isPrefilling || isFormDisabled}
                            required
                          />
                          {fieldErrors[name] ? (
                            <p className="mt-2 text-xs font-medium text-red-500">
                              {fieldErrors[name]}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-stone-200 bg-[#fcfaf7] p-5">
                    <h3 className="text-lg font-bold text-blackhex">
                      Terms and delivery guidance
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      We use these details to fulfill your order, send your
                      confirmation, and let you retrieve guest purchases later from{" "}
                      <Link href="/my-orders" className="font-semibold text-primary">
                        My Orders
                      </Link>
                      .
                    </p>

                    <label className="mt-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={acceptPolicies}
                        onChange={(event) => {
                          setAcceptPolicies(event.target.checked);
                          setFieldErrors((prev) => {
                            if (!prev.acceptPolicies) return prev;
                            const next = { ...prev };
                            delete next.acceptPolicies;
                            return next;
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm leading-6 text-stone-700">
                        I accept the{" "}
                        <Link href="/terms" className="font-semibold text-primary">
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="font-semibold text-primary">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>
                    {fieldErrors.acceptPolicies ? (
                      <p className="mt-2 text-xs font-medium text-red-500">
                        {fieldErrors.acceptPolicies}
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-secondary/10 bg-white p-4 text-sm leading-6 text-stone-600">
                      <p>Secure payment is handled by Stripe.</p>
                      <p className="mt-1">
                        Physical orders receive shipping updates. Digital orders
                        can be retrieved from My Orders or downloaded from the
                        order page after purchase.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isPrefilling}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Save checkout details"}
                  </button>
                </form>
              )}
            </div>
          </section>

          <aside className="w-full lg:sticky lg:top-28 lg:self-start">
            <GuestCheckoutSummary
              shippingQuote={shippingQuote}
              guestAddress={formValues}
              guestId={guestId}
              guestCheckoutState={{
                ready: guestCheckoutReady,
                acceptPolicies,
                saveGuestDetails: persistGuestAddress,
                onRequireGuestDetails: focusGuestForm,
              }}
            />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
