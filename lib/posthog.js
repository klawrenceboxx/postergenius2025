"use client";

export function capturePostHog(eventName, properties = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.posthog?.capture?.(eventName, properties);
}
