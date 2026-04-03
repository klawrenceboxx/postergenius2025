## Summary

The six performance changes are mostly correct and well-targeted, but there is one real bug (priority/loading conflict in HeroBanner) and two moderate concerns (sizes accuracy for ProductCard, and the S3 remote pattern being overly permissive for a bucket that should never serve images through next/image).

---

## Issues

- **[severity: high] Correctness — HeroBanner: `priority` prop conflicts with `loading: "lazy"` from `getOptimizedImageProps`**

  `getOptimizedImageProps` unconditionally returns `loading: "lazy"` in the object it spreads. HeroBanner then spreads that object first (`{...getOptimizedImageProps(...)}`) and passes `priority` as a separate prop afterward. In Next.js, when both `loading="lazy"` and `priority` are present on the same `<Image>`, Next.js logs a warning and the `loading="lazy"` attribute wins — the image is NOT preloaded. The intent of adding `priority` to the hero is defeated entirely.

  The spread order means `loading: "lazy"` is set by the spread, then `priority={true}` is set, but Next.js documents that `priority` is ignored when `loading` is explicitly set to `"lazy"`. The hero image will still lazy-load, missing the LCP improvement this change was meant to deliver.

  Suggested fix: `getOptimizedImageProps` should omit `loading` when the caller passes `priority`. The simplest approach is to have it accept a `priority` option and skip emitting `loading` in that case, or to add `loading={undefined}` after the spread in HeroBanner to override it. As the code stands today it is broken for its stated purpose.

- **[severity: medium] Correctness — ProductCard `sizes` values do not match the actual grid**

  The grid in `HomeProducts.jsx` is:
  ```
  grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
  ```
  Tailwind breakpoints: `md` = 768px, `lg` = 1024px, `xl` = 1280px.

  The updated `sizes` string is:
  ```
  (max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw
  ```

  Problem: the 2-column layout runs from 0 to 767px (below `md`), but the `sizes` string switches from 50vw to 33vw at 640px. Between 640px and 767px the grid is still 2 columns (50vw each), but the browser will request a 33vw-sized image — too small. The card also has a hard CSS max-width of `max-w-[250px]`, so in practice this is unlikely to cause a visible quality regression, but it means the browser may request a larger image than needed in the 640–767px range and a too-small image in the 0–639px range on certain device pixel ratios.

  The breakpoint for the 2→3 column switch should be `768px` (or `min-width: 768px`), not `640px`. A more accurate string would be:
  ```
  (max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw
  ```
  Given the `max-w-[250px]` cap on the card, the real-world impact is minor, but the values are technically incorrect against the grid.

- **[severity: low] Security/Correctness — S3 bucket added to `remotePatterns` for no valid reason**

  The S3 bucket (`postergenius-poster-downloads.s3.us-east-2.amazonaws.com`) stores digital download files — actual poster files for paid customers, not display images. Adding it to `remotePatterns` enables next/image to proxy and cache files from that bucket through the Next.js image optimizer, which serves no legitimate purpose (download links are presigned S3 URLs, not `<Image>` src values anywhere in the codebase).

  The risk is twofold: (1) if any code path accidentally renders a download URL in an `<Image>` tag, the file contents get proxied through the image optimizer and cached on Vercel CDN, which is not the intended delivery path for paid downloads; (2) `pathname: '**'` gives blanket permission over the entire bucket. This should be removed unless a specific use case for displaying S3-hosted images through next/image exists.

- **[severity: low] Performance — `minimumCacheTTL: 31536000` (1 year) is aggressive for product images**

  A 1-year cache TTL means any product image URL that is updated (e.g., seller replaces a listing photo) will continue serving the old version from Vercel's image cache for up to a year unless the URL changes. Cloudinary URLs include version segments (`v1738667237/...`) so new uploads will naturally produce different URLs — that's fine. But if any image URL is reused with updated content, visitors will see stale images. This is low risk given Cloudinary's versioned URLs, but worth being aware of. A value of `2592000` (30 days) would still be a strong cache hit rate with less risk of stale images.

---

## What Is Correct

- **FeaturedCategory `<Image fill>` with StaticImport:** Works correctly. `assets.category_space` etc. are StaticImport objects (Next.js processes `.png` imports at build time into `{ src, width, height, blurDataURL }`). Next.js `<Image>` accepts StaticImport natively. The `fill` prop with a positioned parent is the right pattern for background-style images. The `sizes` value (`100vw / 50vw / 33vw`) accurately matches the `grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-3` layout. This change is clean and correct.

- **HeroBanner `sizes="100vw"`:** The value is correct — the hero is full-width. The `priority` intent is correct. The bug is only in the interaction with `getOptimizedImageProps` described above.

- **Omnisend script strategy change (`beforeInteractive` → `afterInteractive`):** Correct. `beforeInteractive` blocks hydration and is reserved for scripts that must run before the page is interactive (e.g., consent managers). Omnisend is a marketing/email tool with no such requirement. `afterInteractive` is the right strategy. The three-script init sequence (queue → loader → init) is also correctly ordered.

- **HomeProducts `priority={index < 4}`:** Correct implementation. The first 4 product cards get `priority`, matching roughly the above-the-fold cards on all common viewport sizes (2-col mobile shows 2 above fold; 3–5 col desktop shows 3–5). The `slice(0, 15)` limit is preserved. Passing the index through `.map` is correct.

- **ProductCard `width={400} height={400}`:** Correct. The previous `800×800` was generating larger images than the card ever renders (max-width 250px, display height 320px). 400px provides adequate resolution for 2× DPR screens at the actual rendered size.

- **`next.config.mjs` formats and deviceSizes:** Adding `image/avif` and `image/webp` formats is correct and beneficial — Next.js will serve AVIF to supporting browsers (significant size savings for poster images). The `deviceSizes` and `imageSizes` arrays are reasonable. Replacing a `domains` array with `remotePatterns` is the correct modern approach; `domains` was deprecated in Next.js 13 and the migration is correct.

---

## Verdict

NEEDS CHANGES — the `priority` + `loading: "lazy"` conflict is a blocking correctness bug: the hero image optimization that was the stated goal of change #1 is not actually working. Fix `getOptimizedImageProps` to respect `priority` before shipping.
