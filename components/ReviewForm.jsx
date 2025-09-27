"use client";

import { useAuth, useUser, SignInButton } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const StarSelector = ({ value, onChange, disabled }) => {
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const ratingValue = index + 1;
        const isActive = ratingValue <= activeValue;
        return (
          <button
            key={ratingValue}
            type="button"
            className={`transition-transform ${
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"
            }`}
            onClick={() => !disabled && onChange(ratingValue)}
            onMouseEnter={() => !disabled && setHovered(ratingValue)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${ratingValue} star${ratingValue === 1 ? "" : "s"}`}
          >
            <svg
              aria-hidden="true"
              className={`h-7 w-7 ${
                isActive ? "text-yellow-400" : "text-gray-300"
              } transition-colors`}
              viewBox="0 0 24 24"
              fill={isActive ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="m12 3.25 2.694 5.457 6.026.877-4.36 4.252 1.029 6.009L12 16.99l-5.389 2.855 1.03-6.009-4.36-4.252 6.026-.877L12 3.25Z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default function ReviewForm({ productId, onSubmitted }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = useMemo(
    () => user?.publicMetadata?.role === "admin",
    [user?.publicMetadata?.role]
  );

  if (!isLoaded) {
    return <p className="text-sm text-gray-500">Checking your account…</p>;
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Join the conversation.</span> Sign in to
          leave a review about your purchase.
        </p>
        <div className="mt-3">
          <SignInButton>
            <button className="px-4 py-2 rounded-md bg-black text-white text-sm">
              Sign in
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Admins can add reviews from the dashboard.
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Reviews are unavailable for this product.
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!comment.trim()) {
      toast.error("Please share a few words about your experience.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({ rating, comment, productId }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to submit review");
      }

      toast.success("Thanks for sharing your feedback!");
      setComment("");
      setRating(5);
      onSubmitted?.(payload.review);
    } catch (error) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-gray-200 p-4 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Your rating
        </label>
        <StarSelector value={rating} onChange={setRating} disabled={submitting} />
      </div>

      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700">
          Your review
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Tell others what you loved about your poster."
          className={[
            "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm",
            "focus:border-black focus:outline-none",
          ].join(" ")}
          rows={4}
          disabled={submitting}
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
