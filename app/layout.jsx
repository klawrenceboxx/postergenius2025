import Image from "next/image";
import Script from "next/script";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins } from "next/font/google";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import SlideInOptIn from "@/components/SlideInOptIn";

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
        <head>
          {/* Google Analytics 4 setup */}
          <Script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-WS50WJJDNT"
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-WS50WJJDNT');
            `}
          </Script>

          {/* Meta (Facebook) Pixel setup */}
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1120594359291706');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <Image
              {...getOptimizedImageProps(
                "https://www.facebook.com/tr?id=1120594359291706&ev=PageView&noscript=1"
              )}
              height={1}
              width={1}
              style={{ display: "none" }}
              alt="Facebook pixel tracking"
              unoptimized
            />
          </noscript>
        </head>
        <body
          className={`${poppins.variable} font-sans text-blackhex antialiased`}
        >
          {/* Global toast notifications */}
          <Toaster />
          {/* Provide application context */}
          <AppContextProvider>
            <div className="mx-auto w-full max-w-content px-6 md:px-8 lg:px-0">
              {children}
            </div>
            <SlideInOptIn />
          </AppContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
