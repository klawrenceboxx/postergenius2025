"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SlideInOptIn = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (hasClosed || hasTriggered) {
      return;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    let triggered = false;

    const show = () => {
      if (!triggered) {
        triggered = true;
        setHasTriggered(true);
        window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }
    };

    const timeoutId = window.setTimeout(show, 5000);

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollableDistance = scrollHeight - clientHeight;

      if (scrollableDistance <= 0) {
        return;
      }

      const progress = scrollTop / scrollableDistance;

      if (progress >= 0.5) {
        show();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasClosed, hasTriggered]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const closePanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsVisible(false);

    closeTimeoutRef.current = window.setTimeout(() => {
      setHasClosed(true);
      closeTimeoutRef.current = null;
    }, 300);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!agreed) {
      setError("Please agree to receive updates.");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const response = await fetch("/api/omnisend/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Subscription failed. Please try again.");
      }

      setStatus("success");

      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      closeTimeoutRef.current = window.setTimeout(() => {
        closePanel();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  if (hasClosed || !hasTriggered) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-full max-w-sm transform transition-transform duration-500 ease-out md:max-w-md ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Join PosterGenius for exclusive offers
          </h2>
          <button
            type="button"
            onClick={closePanel}
            className="text-2xl leading-none text-gray-400 transition hover:text-gray-600"
            aria-label="Close opt-in panel"
          >
            &times;
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="optin-email" className="sr-only">
              Email address
            </label>
            <input
              id="optin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="optin-agree"
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <label htmlFor="optin-agree" className="text-sm text-gray-600">
              I agree to receive updates
            </label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {status === "success" && (
            <p className="text-sm text-green-600">Thanks for subscribing!</p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SlideInOptIn;
