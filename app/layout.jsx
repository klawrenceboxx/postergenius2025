import Image from "next/image";
import Script from "next/script";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";
import { Poppins } from "next/font/google";
import { getOptimizedImageProps } from "@/lib/imageUtils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

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
          <link rel="preconnect" href="https://clerk.postergenius.ca" crossOrigin="" />
          {posthogKey ? <link rel="preconnect" href={posthogHost} crossOrigin="" /> : null}
          {/* Google Analytics 4 setup */}
          <Script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-WS50WJJDNT"
            strategy="afterInteractive"
          />
          {posthogKey ? (
            <Script id="posthog-init" strategy="afterInteractive">
              {`
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){
                function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){
                t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript";
                p.async=!0;p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js";
                (r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;
                for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){
                var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people"};
                o="capture identify alias people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user reset_groups set_config set_person_properties_for_flags onFeatureFlags getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures onSessionId".split(" "),
                n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                posthog.init('${posthogKey}', {
                  api_host: '${posthogHost}',
                  person_profiles: 'identified_only'
                });
              `}
            </Script>
          ) : null}
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
            <main className="mx-auto w-full max-w-content lg:px-0">
              {children}
            </main>
          </AppContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
