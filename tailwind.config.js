/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#8E35FF",
        secondary: "#B882FF",
        tertiary: "#712BCC",
        blackhex: "#150826",
      },
      maxWidth: {
        content: "1800px",
      },
      boxShadow: {
        poster:
          // "0 16px 40px rgba(142, 53, 255, 0.18), 0 6px 18px rgba(21, 8, 38, 0.18)",
          "0px 2px 6px rgba(142, 53, 255, 0.18), 2px 4px 4px rgba(21, 8, 38, 0.8)",
      },
      gridTemplateColumns: {
        auto: "repeat(auto-fit, minmax(200px, 1fr))",
      },
      keyframes: {
        "grow-underline": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
