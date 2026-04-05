"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, ShieldCheck, X } from "lucide-react";
import { assets } from "@/assets/assets";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import { capturePostHog } from "@/lib/posthog";

const FEATURED_VIDEO = {
  id: "featured-digital-prints",
  title: "How Digital Prints Work",
  duration: "Under 60 sec",
  embedUrl: "",
  thumbnail: assets.peacock_hero,
  eyebrow: "Featured video",
};

const VIDEO_LIBRARY = [
  {
    id: "digital-vs-physical",
    title: "Digital vs Physical",
    description: "What you receive instantly, and what you print later.",
    embedUrl: "",
    thumbnail: "/images/staticMockups/staticMockup1.jpeg",
  },
  {
    id: "best-way-to-print",
    title: "Best way to print",
    description: "Paper, sizing, and quick quality tips before checkout.",
    embedUrl: "",
    thumbnail: "/images/staticMockups/staticMockup2.jpeg",
  },
  {
    id: "where-to-print",
    title: "Where to print",
    description: "The easiest options for fast, reliable poster printing.",
    embedUrl: "",
    thumbnail: "/images/staticMockups/staticMockup3.jpeg",
  },
  {
    id: "file-to-wall",
    title: "File to wall transformation",
    description: "See how a digital file becomes finished wall art.",
    embedUrl: "",
    thumbnail: "/img/mountains.jpg",
  },
];

const QUICK_STEPS = [
  {
    title: "Download your file instantly",
    detail: "Buy once and get immediate access after checkout.",
  },
  {
    title: "Choose your size",
    detail: "Use the included ratios to match the frame or paper you want.",
  },
  {
    title: "Print at home or a local shop",
    detail: "Go DIY or hand the file to a trusted print counter nearby.",
  },
];

function buildEmbedUrl(url, { autoplay = false, muted = false } = {}) {
  if (!url) {
    return "";
  }

  const separator = url.includes("?") ? "&" : "?";
  const params = [
    "rel=0",
    "modestbranding=1",
    "playsinline=1",
    autoplay ? "autoplay=1" : null,
    muted ? "mute=1" : null,
  ]
    .filter(Boolean)
    .join("&");

  return `${url}${separator}${params}`;
}

function VideoFallback({ title, description, eyebrow }) {
  return (
    <div className="relative flex h-full min-h-[320px] w-full items-end overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(244,240,233,0.9)_45%,_rgba(231,222,211,0.95)_100%)] p-8 shadow-[0_30px_80px_rgba(21,8,38,0.08)]">
      <div className="absolute inset-x-6 top-6 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.28em] text-blackhex/45">
        <span>{eyebrow}</span>
        <span>Video ready</span>
      </div>
      <div className="absolute right-8 top-16 flex h-16 w-16 items-center justify-center rounded-full border border-blackhex/10 bg-white/80 text-blackhex shadow-lg">
        <Play className="ml-1 h-6 w-6" />
      </div>
      <div className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-blackhex/45">
          Swap in your hosted embed URL
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-blackhex md:text-4xl">
          {title}
        </h3>
        <p className="mt-4 max-w-lg text-sm leading-7 text-blackhex/65 md:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

function VideoFrame({ video, featured = false }) {
  const src = buildEmbedUrl(video.embedUrl, {
    autoplay: featured,
    muted: featured,
  });

  if (!src) {
    return (
      <VideoFallback
        title={video.title}
        description="Embed your main explainer here. The page layout, CTA flow, tracking, and modal behavior are already wired."
        eyebrow={video.eyebrow || "Video"}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-blackhex/10 bg-[#f6f0e9] shadow-[0_30px_80px_rgba(21,8,38,0.08)]">
      <div className="aspect-video w-full">
        <iframe
          className="h-full w-full"
          src={src}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function HowItWorksClient() {
  const [activeVideo, setActiveVideo] = useState(null);

  const activeVideoSrc = useMemo(() => {
    if (!activeVideo?.embedUrl) {
      return "";
    }

    return buildEmbedUrl(activeVideo.embedUrl, { autoplay: true });
  }, [activeVideo]);

  useEffect(() => {
    const startedAt = Date.now();
    capturePostHog("how_it_works_page_viewed", {
      page: "/videos",
    });

    const trackTime = () => {
      const secondsOnPage = Math.round((Date.now() - startedAt) / 1000);
      capturePostHog("how_it_works_time_spent", {
        page: "/videos",
        seconds_on_page: secondsOnPage,
      });
    };

    window.addEventListener("pagehide", trackTime);

    return () => {
      window.removeEventListener("pagehide", trackTime);
      trackTime();
    };
  }, []);

  useEffect(() => {
    if (!activeVideo) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setActiveVideo(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeVideo]);

  const handleOpenVideo = (video, location) => {
    setActiveVideo(video);
    capturePostHog("how_it_works_video_clicked", {
      page: "/videos",
      video_id: video.id,
      video_title: video.title,
      location,
    });
  };

  const handleCtaClick = (label, destination) => {
    capturePostHog("how_it_works_cta_clicked", {
      page: "/videos",
      cta_label: label,
      destination,
    });
  };

  return (
    <div className="bg-[#f8f4ee] text-blackhex">
      <section className="relative overflow-hidden border-b border-blackhex/8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(247,241,232,0.95)_55%,_rgba(236,228,217,0.92)_100%)] px-6 pb-14 pt-10 md:px-8 lg:px-12 lg:pt-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blackhex/15 to-transparent" />
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.34em] text-blackhex/45">
                How It Works
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-blackhex md:text-6xl">
                How Digital Prints Work
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-blackhex/65 md:text-xl md:leading-8">
                Everything you need to know in under a minute.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                onClick={() => handleCtaClick("Shop Posters", "/shop")}
                className="rounded-full bg-blackhex px-6 py-3 text-sm font-medium text-white transition hover:bg-blackhex/90"
              >
                Shop Posters
              </Link>
              <Link
                href="/shop"
                onClick={() => handleCtaClick("Browse Collection", "/shop")}
                className="rounded-full border border-blackhex/12 bg-white/85 px-6 py-3 text-sm font-medium text-blackhex transition hover:border-blackhex/25 hover:bg-white"
              >
                Browse Collection
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
            <div className="relative">
              <VideoFrame video={FEATURED_VIDEO} featured />
              <button
                type="button"
                onClick={() => handleOpenVideo(FEATURED_VIDEO, "featured")}
                className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-medium text-blackhex shadow-lg backdrop-blur transition hover:bg-white"
              >
                <Play className="h-4 w-4" />
                Watch full overview
              </button>
            </div>

            <aside className="rounded-[2rem] border border-blackhex/8 bg-white/70 p-6 shadow-[0_20px_60px_rgba(21,8,38,0.05)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-blackhex/40">
                Quick steps
              </p>
              <div className="mt-6 space-y-5">
                {QUICK_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-3xl border border-blackhex/8 bg-[#fcfaf7] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blackhex text-sm font-semibold text-white">
                        0{index + 1}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-[-0.03em]">
                          {step.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-blackhex/60">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-950/10 bg-[#f3eee7] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <p className="text-sm leading-6 text-blackhex/70">
                    Most customers print at Staples or local print shops.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-blackhex/40">
                Video library
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                Watch the whole process in a few taps
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                onClick={() => handleCtaClick("Shop Posters", "/shop")}
                className="rounded-full bg-blackhex px-5 py-3 text-sm font-medium text-white transition hover:bg-blackhex/90"
              >
                Shop Posters
              </Link>
              <Link
                href="/shop"
                onClick={() => handleCtaClick("Browse Collection", "/shop")}
                className="rounded-full border border-blackhex/12 bg-white px-5 py-3 text-sm font-medium text-blackhex transition hover:border-blackhex/25"
              >
                Browse Collection
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {VIDEO_LIBRARY.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => handleOpenVideo(video, "grid")}
                className="group overflow-hidden rounded-[1.75rem] border border-blackhex/8 bg-white text-left shadow-[0_18px_45px_rgba(21,8,38,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_55px_rgba(21,8,38,0.1)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-blackhex shadow-lg">
                    <Play className="ml-0.5 h-5 w-5" />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-blackhex">
                    {video.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-blackhex/60">
                    {video.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-40 border-t border-blackhex/10 bg-white/92 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-blackhex/60">
            Learn it fast. Pick your poster. Print when you want.
          </p>
          <div className="flex gap-3">
            <Link
              href="/shop"
              onClick={() => handleCtaClick("Shop Posters", "/shop")}
              className="flex-1 rounded-full bg-blackhex px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-blackhex/90 md:flex-none"
            >
              Shop Posters
            </Link>
            <Link
              href="/shop"
              onClick={() => handleCtaClick("Browse Collection", "/shop")}
              className="flex-1 rounded-full border border-blackhex/12 bg-[#f7f3ed] px-5 py-3 text-center text-sm font-medium text-blackhex transition hover:border-blackhex/25 md:flex-none"
            >
              Browse Collection
            </Link>
          </div>
        </div>
      </div>

      {activeVideo ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black transition hover:bg-white"
              aria-label="Close video modal"
            >
              <X className="h-5 w-5" />
            </button>

            {activeVideoSrc ? (
              <div className="aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src={activeVideoSrc}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative min-h-[360px] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(0,0,0,0.92)_70%)] p-8 text-white md:min-h-[520px] md:p-12">
                <Image
                  {...getOptimizedImageProps(activeVideo.thumbnail)}
                  alt={activeVideo.title}
                  fill
                  className="object-cover opacity-25"
                />
                <div className="relative z-10 max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.32em] text-white/55">
                    Modal video
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                    {activeVideo.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 md:text-base">
                    Add the hosted embed URL for this card and it will play here
                    in-modal without sending shoppers away from the page.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
