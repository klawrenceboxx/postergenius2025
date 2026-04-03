"use client";
import { useEffect, useMemo, useState } from "react";
import PosterMockupViewer from "@/components/product/PosterMockupViewer";
import Infos from "@/components/product/Infos";
import ProductCard from "@/components/ProductCard";
import Testimonials from "@/components/Testimonials";
import NewsLetter from "@/components/NewsLetter";
import { useAppContext } from "@/context/AppContext";
import { getOrCreateGuestId } from "@/lib/guestUtils";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

const RECENTLY_VIEWED_KEY = "posterGenius.recentlyViewed";
const DISCOVERY_BATCH_SIZE = 8;

const cx = (...xs) => xs.filter(Boolean).join(" ");

function normalizeId(product) {
  if (!product) return "";
  if (typeof product?._id === "object" && product?._id !== null) {
    return product._id.toString();
  }
  return (
    product?._id ?? product?.productId ?? product?.id ?? product?.slug ?? ""
  );
}

function normalizeTimestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshotProduct(product) {
  if (!product) return null;

  return {
    _id: normalizeId(product),
    productId: normalizeId(product),
    slug: product.slug || normalizeId(product),
    name: product.name || product.title || "Poster",
    title: product.title || product.name || "Poster",
    image: Array.isArray(product.image)
      ? product.image
      : product.imageUrl
      ? [product.imageUrl]
      : [],
    imageUrl: product.imageUrl || product.image?.[0] || "",
    category: product.category || "",
    orientation: product.orientation || "portrait",
    finalPrice:
      product?.pricing?.defaultPhysicalFinalPrice ??
      product?.finalPrice ??
      product?.price ??
      0,
    pricing: product.pricing,
    date: product.date || new Date().toISOString(),
    physicalDiscount:
      product?.pricing?.physicalDiscount ?? product?.physicalDiscount ?? 0,
  };
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-blackhex">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}

function PaymentBadge({ label, emphasized = false }) {
  return (
    <span
      className={cx(
        "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium",
        emphasized
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white text-gray-700"
      )}
    >
      {label}
    </span>
  );
}

function TrustCard({ icon: Icon, title, description, detail, children }) {
  return (
    <article className="rounded-[28px] border border-gray-200 bg-[#faf8f4] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blackhex shadow-sm">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-blackhex">{title}</h3>
      <p className="mt-2 text-sm text-gray-700">{description}</p>
      <p className="mt-3 text-sm leading-6 text-gray-500">{detail}</p>
      {children ? <div className="mt-5 flex flex-wrap gap-2">{children}</div> : null}
    </article>
  );
}

export default function ProductPage({ product }) {
  const { products, user, getToken } = useAppContext();
  const initialDimensions =
    product?.defaultPhysicalDimensions ||
    product?.variations?.[0]?.sizes?.[0]?.size ||
    "12x18";

  const [selectedDimensions, setSelectedDimensions] =
    useState(initialDimensions);
  const [activeMockupIndex, setActiveMockupIndex] = useState(0);
  const [format, setFormat] = useState("physical");
  const [discoveryTab, setDiscoveryTab] = useState("similar");
  const [visibleDiscoveryCount, setVisibleDiscoveryCount] =
    useState(DISCOVERY_BATCH_SIZE);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const currentProductId = useMemo(() => normalizeId(product), [product]);
  const currentCategory = product?.category || "";

  useEffect(() => {
    setVisibleDiscoveryCount(DISCOVERY_BATCH_SIZE);
  }, [discoveryTab, currentProductId]);

  useEffect(() => {
    let isActive = true;

    const trackProductView = async () => {
      if (!currentProductId) return;

      const headers = { "Content-Type": "application/json" };
      const payload = {
        productId: currentProductId,
        path: `/product/${currentProductId}`,
      };

      if (user) {
        const token = await getToken?.();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } else {
        const guestId = getOrCreateGuestId();
        if (guestId) {
          headers["x-guest-id"] = guestId;
          payload.guestId = guestId;
        }
      }

      try {
        await fetch("/api/events/view", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (error) {
        if (isActive) {
          console.warn("[ProductPage] Failed to track product view", error);
        }
      }
    };

    trackProductView();

    return () => {
      isActive = false;
    };
  }, [currentProductId, getToken, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentSnapshot = snapshotProduct(product);
    if (!currentSnapshot?._id) return;

    try {
      const stored = JSON.parse(
        window.localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]"
      );
      const next = [
        currentSnapshot,
        ...stored.filter((item) => item?._id !== currentSnapshot._id),
      ].slice(0, 12);

      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
      setRecentlyViewed(next.filter((item) => item?._id !== currentSnapshot._id));
    } catch {
      setRecentlyViewed([]);
    }
  }, [product]);

  const catalog = useMemo(() => {
    const productMap = new Map();

    for (const item of products || []) {
      const id = normalizeId(item);
      if (!id || id === currentProductId) continue;
      productMap.set(id, item);
    }

    const mergeWithCatalog = (items) =>
      items
        .filter(Boolean)
        .map((item) => {
          const id = normalizeId(item);
          return id && id !== currentProductId ? productMap.get(id) || item : null;
        })
        .filter(Boolean);

    return {
      all: Array.from(productMap.values()),
      recentlyViewed: mergeWithCatalog(recentlyViewed),
    };
  }, [currentProductId, products, recentlyViewed]);

  const discoveryProducts = useMemo(() => {
    const allProducts = catalog.all;
    if (!allProducts.length) return [];

    const newestFirst = [...allProducts].sort(
      (a, b) => normalizeTimestamp(b?.date) - normalizeTimestamp(a?.date)
    );
    const discountedFirst = [...allProducts].sort((a, b) => {
      const discountDelta =
        (b?.pricing?.physicalDiscount ?? b?.physicalDiscount ?? 0) -
        (a?.pricing?.physicalDiscount ?? a?.physicalDiscount ?? 0);

      if (discountDelta !== 0) return discountDelta;
      return normalizeTimestamp(b?.date) - normalizeTimestamp(a?.date);
    });

    const similarFirst = [
      ...newestFirst.filter((item) => item?.category === currentCategory),
      ...newestFirst.filter((item) => item?.category !== currentCategory),
    ];

    const byTab = {
      similar: similarFirst,
      popular: newestFirst,
      "best-selling": discountedFirst,
    };

    const selected = byTab[discoveryTab] || newestFirst;
    const unique = [];
    const seen = new Set();

    for (const item of selected) {
      const id = normalizeId(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(item);
    }

    return unique;
  }, [catalog.all, currentCategory, discoveryTab]);

  const visibleDiscoveryProducts = discoveryProducts.slice(
    0,
    visibleDiscoveryCount
  );
  const hasMoreDiscovery = visibleDiscoveryCount < discoveryProducts.length;
  const recentProducts = catalog.recentlyViewed.slice(0, 8);

  const discoveryTabs = [
    {
      key: "similar",
      label: "Similar",
      description: "More posters from the same category, with the rest of the catalog used as fallback.",
    },
    {
      key: "popular",
      label: "Popular",
      description: "Newest posters from across the catalog while we do not yet have true popularity analytics.",
    },
    {
      key: "best-selling",
      label: "Best-selling",
      description: "Highest-discount posters for now, which is the closest sales proxy in the current dataset.",
    },
  ];

  return (
    <div className="w-full">
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/shop" className="hover:text-black">
          Browse All
        </Link>
        <span className="mx-2">›</span>
        <span className="font-medium text-gray-900">
          {product?.title || product?.name || "Product"}
        </span>
      </nav>

      <div className="flex w-full flex-col gap-6 lg:gap-8">
        <div className="px-4 lg:hidden">
          <Infos
            product={product}
            selectedDimensions={selectedDimensions}
            onDimensionsChange={setSelectedDimensions}
            format={format}
            onFormatChange={setFormat}
            mobileControlsOnly
          />
        </div>

        <div className="flex w-full flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <PosterMockupViewer
            posterUrl={product.imageUrl}
            selectedDimensions={selectedDimensions}
            activeMockupIndex={activeMockupIndex}
            onMockupChange={setActiveMockupIndex}
            format={format}
            orientation={product.orientation}
          />
        </div>
        <div className="w-full flex-shrink-0 px-4 md:w-[360px] xl:w-[400px]">
          <Infos
            product={product}
            selectedDimensions={selectedDimensions}
            onDimensionsChange={setSelectedDimensions}
            format={format}
            onFormatChange={setFormat}
            hideMobileControls
          />
        </div>
      </div>
      </div>

      <section className="mt-20 border-t border-gray-200 pt-14">
        <SectionHeading
          eyebrow="Keep exploring"
          title="Explore more posters"
          description="This extends the product detail page into a browseable feed so shoppers can stay in flow instead of bouncing back to the shop grid."
        />

        <div className="mt-8 inline-flex rounded-full bg-gray-100 p-1">
          {discoveryTabs.map((tab) => {
            const active = discoveryTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                onClick={() => setDiscoveryTab(tab.key)}
                className={cx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border border-secondary bg-white text-secondary shadow"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-gray-600">
          {discoveryTabs.find((tab) => tab.key === discoveryTab)?.description}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {visibleDiscoveryProducts.map((item, index) => (
            <ProductCard
              key={normalizeId(item)}
              product={item}
              priority={index < 4}
            />
          ))}
        </div>

        {hasMoreDiscovery ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() =>
                setVisibleDiscoveryCount((count) => count + DISCOVERY_BATCH_SIZE)
              }
              className="rounded-full border-2 border-blackhex px-8 py-3 text-sm font-semibold text-blackhex transition hover:bg-blackhex hover:text-white"
            >
              See more posters
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-20 border-t border-gray-200 pt-14">
        <SectionHeading
          eyebrow="In their space"
          title="Displayed posters in your space"
          description="A testimonial-style gallery to show how posters look once they are actually hung up."
        />
        <Testimonials className="py-10 md:py-16" showHeader={false} />
      </section>

      {recentProducts.length ? (
        <section className="mt-20 border-t border-gray-200 pt-14">
          <SectionHeading
            eyebrow="Recently viewed"
            title="Recently viewed posters"
            description="A local history strip so people can jump back to posters they already opened during the session."
          />

          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {recentProducts.map((item, index) => (
              <ProductCard
                key={`recent-${normalizeId(item)}`}
                product={item}
                priority={index < 4}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-20">
        <NewsLetter />
      </div>

      <section className="mt-14 mb-20 rounded-[32px] border border-gray-200 bg-white p-6 md:p-10">
        <SectionHeading
          eyebrow="Trust"
          title="Fast delivery, secure payments, and easy returns"
          description="This sits at the bottom of the page as a final confidence layer before visitors leave or continue shopping."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <TrustCard
            icon={Truck}
            title="Fast delivery"
            description="At your door in a few days."
            detail="Printful-powered production and shipping keep fulfillment fast once the order is placed."
          >
            <PaymentBadge label="Printful" emphasized />
          </TrustCard>

          <TrustCard
            icon={ShieldCheck}
            title="Secure payments"
            description="100% secure payments with 256-bit SSL encryption."
            detail="Supports Visa, Mastercard, Discover, American Express, Google Pay, Apple Pay, and PayPal."
          >
            <PaymentBadge label="Visa" />
            <PaymentBadge label="Mastercard" />
            <PaymentBadge label="Discover" />
            <PaymentBadge label="American Express" />
            <PaymentBadge label="Google Pay" />
            <PaymentBadge label="Apple Pay" />
            <PaymentBadge label="PayPal" />
          </TrustCard>

          <TrustCard
            icon={RotateCcw}
            title="100-day returns"
            description="Easy returns, no questions asked."
            detail="A longer return window lowers purchase anxiety for shoppers comparing multiple poster options."
          />
        </div>
      </section>
    </div>
  );
}
