// /lib/metaPixel.js
// Safely proxy calls to the Facebook Pixel after the script has loaded.
export const fbq = (...args) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
};
