"use client";

import { useAuth, useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function ProductDropdown({ value, onChange, disabled }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload.success) {
          setProducts(payload.products || []);
        }
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading products…</p>;
  }

  return (
    <div>
      <label
        className="block text-sm font-medium text-gray-700"
        htmlFor="admin-review-product"
      >
        Product
      </label>
      <select
        id="admin-review-product"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm",
          "focus:border-black focus:outline-none",
        ].join(" ")}
        disabled={disabled}
      >
        <option value="">-- Select a product --</option>
        {products.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const StarSelector = ({ value, onChange, disabled }) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const ratingValue = index + 1;
        const filled = ratingValue <= active;
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
            aria-label={`${ratingValue} star${ratingValue === 1 ? "" : "s"}`}
          >
            <svg
              aria-hidden="true"
              className={`h-7 w-7 ${
                filled ? "text-yellow-400" : "text-gray-300"
              } transition-colors`}
              viewBox="0 0 24 24"
              fill={filled ? "currentColor" : "none"}
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

export default function SellerReviewsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [username, setUsername] = useState("");
  const [productId, setProductId] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = useMemo(
    () => user?.publicMetadata?.role === "admin",
    [user?.publicMetadata?.role]
  );

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!productId.trim()) {
      toast.error("Product is required");
      return;
    }

    if (!comment.trim()) {
      toast.error("Comment is required");
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
        body: JSON.stringify({
          username: username.trim(),
          comment: comment.trim(),
          rating,
          productId: productId.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to save review");
      }

      toast.success("Review saved");
      setUsername("");
      setComment("");
      setProductId("");
      setRating(5);
    } catch (error) {
      toast.error(error.message || "Failed to save review");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <div className="p-10 text-sm text-gray-600">Loading…</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="p-10">
        <div className="rounded-md border border-gray-200 bg-white p-6 shadow">
          <p className="text-gray-700">You must sign in to manage reviews.</p>
          <div className="mt-4">
            <SignInButton>
              <button className="px-4 py-2 rounded-md bg-black text-white text-sm">
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-10 text-sm text-red-500">Access denied.</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Add a customer review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Reviews added here appear exactly like customer feedback on product pages.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <ProductDropdown
          value={productId}
          onChange={setProductId}
          disabled={submitting}
        />

        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="admin-review-username"
          >
            Display name
          </label>
          <input
            id="admin-review-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. Alex from New York"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
            disabled={submitting}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rating
          </label>
          <StarSelector value={rating} onChange={setRating} disabled={submitting} />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="admin-review-comment"
          >
            Comment
          </label>
          <textarea
            id="admin-review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            placeholder="Share what made this poster special."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none"
            disabled={submitting}
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setUsername("");
              setProductId("");
              setComment("");
              setRating(5);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm"
            disabled={submitting}
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save review"}
          </button>
        </div>
      </form>
    </div>
  );
}
