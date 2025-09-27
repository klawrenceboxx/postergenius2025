"use client";

import { useCallback, useEffect, useState } from "react";
import ReviewForm from "./ReviewForm";

const StarDisplay = ({ rating }) => {
  const rounded = Math.round(rating);
  return (
    <span className="text-yellow-500 text-sm">
      {Array.from({ length: 5 }, (_, idx) => (
        <span key={idx}>{idx < rounded ? "★" : "☆"}</span>
      ))}
    </span>
  );
};

export default function ReviewModal({
  onClose,
  productId,
  initialAverage = 0,
  initialTotal = 0,
  onStatsChange,
}) {
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(initialAverage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    setAverage(initialAverage);
  }, [initialAverage]);

  useEffect(() => {
    setTotal(initialTotal);
  }, [initialTotal]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/reviews`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load reviews");
      }

      const nextReviews = payload.reviews || [];
      const nextAverage = payload.average || 0;
      const nextTotal = payload.total || 0;
      const nextLimit = payload.limit || 20;

      setReviews(nextReviews);
      setAverage(nextAverage);
      setTotal(nextTotal);
      setLimit(nextLimit);
      onStatsChange?.({ average: nextAverage, total: nextTotal });
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setReviews([]);
    setError("");
    setLoading(true);
    fetchReviews();
  }, [fetchReviews]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Customer reviews</h2>
            <p className="text-sm text-gray-500">
              {total > 0
                ? `${average.toFixed(1)} out of 5 · ${total} review${total === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          <ReviewForm productId={productId} onSubmitted={fetchReviews} />

          {loading && reviews.length === 0 ? (
            <p className="text-sm text-gray-500">Loading reviews…</p>
          ) : error && reviews.length === 0 ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-500">
              Be the first to share your experience with our products.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-400">
                Showing the latest {Math.min(reviews.length, limit)} reviews.
              </p>
              <ul className="space-y-4">
                {reviews.map((review) => (
                  <li key={review._id} className="border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        {review.username}
                      </span>
                      <StarDisplay rating={review.rating} />
                    </div>
                    <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
              {total > reviews.length && (
                <p className="text-xs text-gray-400">
                  Load more coming soon — displaying the newest {limit} reviews.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
