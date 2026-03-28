"use client";

import { useState } from "react";
import Image from "next/image";
import bgImage from "@/public/subscribe now.jpg";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/omnisend/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "newsletter-hero" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Subscription failed. Please try again.");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <section className="relative w-full mb-6">
      {/* Background image */}
      <div className="absolute inset-0 -z-10 rounded-lg overflow-hidden">
        <Image
          {...getOptimizedImageProps(bgImage)}
          alt="Subscribe background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content aligned left */}
      <div className="flex flex-col items-start text-left space-y-4 max-w-xl px-6 md:px-12 py-16">
        <h1 className="md:text-4xl lg:text-5xl text-2xl font-[700] text-white">
          Subscribe Now & Get 20% Off
        </h1>
        <p className="md:text-base text-sm text-gray-200/90 max-w-md">
          Join our newsletter for the latest discounts and PosterGenius goodies.
        </p>

        {status === "success" ? (
          <p className="text-green-300 font-semibold text-sm md:text-base">
            You&apos;re in! Check your inbox for your 20% off code.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-center w-full md:max-w-lg"
          >
            <input
              className="border border-gray-300 h-12 md:h-14 w-full px-4 text-gray-800 rounded-l-md outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={status === "loading"}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="md:px-10 px-6 h-12 md:h-14 bg-primary text-white font-[700] rounded-r-md hover:bg-secondary transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
        )}

        {error && (
          <p className="text-red-300 text-sm">{error}</p>
        )}
      </div>
    </section>
  );
};

export default NewsLetter;
