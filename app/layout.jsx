import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});
export const metadata = {
  icons: {
    icon: "/PG.svg", // Path to your favicon.ico in the public directory
    shortcut: "/shortcut-icon.png", // Optional: for older browsers/devices
    apple: "/apple-touch-icon.png", // Optional: for Apple devices
    // You can also specify multiple icons with different sizes or types
    // icon:,
  },
  title: "PosterGenius",
  description: "E-Commerce Poster Marketplace with Next.js ",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${poppins.variable} font-sans text-blackhex antialiased`}
        >
          <Toaster />
          <AppContextProvider>
            {" "}
            <div className="mx-auto w-full max-w-content px-6 md:px-8 lg:px-0">
              {children}
            </div>
          </AppContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
