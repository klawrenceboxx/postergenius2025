"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReviewModal from "./ReviewModal";

const formatCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export default function ReviewSummary({ productId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, average: 0 });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/reviews`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load reviews");
      }
      setStats({
        total: payload.total || 0,
        average: payload.average || 0,
      });
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const buttonContent = useMemo(() => {
    if (loading) {
      return <span className="text-sm text-gray-500">Loading reviews…</span>;
    }

    if (error) {
      return <span className="text-sm text-red-500">Reviews unavailable</span>;
    }

    if (stats.total === 0) {
      return <span className="text-sm text-gray-600">Be the first to review</span>;
    }

    return (
      <>
        <span className="text-lg font-semibold">{stats.average.toFixed(1)} ★</span>
        <span className="text-sm text-gray-600">
          · {formatCount(stats.total)} review{stats.total === 1 ? "" : "s"}
        </span>
      </>
    );
  }, [loading, error, stats.average, stats.total]);

  const handleOpen = () => {
    fetchStats();
    setIsOpen(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 text-left"
      >
        {buttonContent}
      </button>

      {isOpen && (
        <ReviewModal
          onClose={() => setIsOpen(false)}
          productId={productId}
          initialAverage={stats.average}
          initialTotal={stats.total}
          onStatsChange={(next) => {
            if (next) {
              setStats({
                total: next.total ?? 0,
                average: next.average ?? 0,
              });
            }
          }}
        />
      )}
    </div>
  );
}
