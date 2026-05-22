import Image from "next/image";
import Script from "next/script";
import "./globals.css";
import { Poppins } from "next/font/google";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import Providers from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export const metadata = {
  icons: {
    icon: "/PG.svg",
    shortcut: "/shortcut-icon.png",
    apple: "/apple-touch-icon.png",
  },
  title: "PosterGenius",
  description: "E-Commerce Poster Marketplace with Next.js ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Connection Optimizations */}
        <link
          rel="preconnect"
          href="https://clerk.postergenius.ca"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://www.clarity.ms" crossOrigin="" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://c.clarity.ms" />
        {posthogKey ? (
          <link rel="preconnect" href={posthogHost} crossOrigin="" />
        ) : null}

        {/* Google Analytics 4 Script Tag */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-WS50WJJDNT"
          strategy="afterInteractive"
        />

        {/* PostHog Setup */}
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

        {/* Omnisend Setup */}
        <Script id="omnisend-init" strategy="afterInteractive">
          {`
            window.omnisend = window.omnisend || [];
            window.omnisend.push(["brandID", "68e5950e13ca46de858cccae"]);
            window.omnisend.push(["track", "$pageViewed"]);
            !function(){
              var e = document.createElement("script");
              e.type = "text/javascript";
              e.async = true;
              e.src = "https://omnisnippet1.com/inshop/launcher-v2.js";
              var t = document.getElementsByTagName("script")[0];
              t.parentNode.insertBefore(e, t);
            }();
          `}
        </Script>

        {/* Google Analytics Data Layer Initialization */}
        <Script id="ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WS50WJJDNT');
          `}
        </Script>

        {/* Microsoft Clarity Installation */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wumm0o21ez");
          `}
        </Script>

        {/* Meta (Facebook) Pixel Initialization */}
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
      </head>
      <body
        className={`${poppins.variable} font-sans text-blackhex antialiased`}
      >
        <Providers>
          <main className="mx-auto w-full max-w-content lg:px-0">
            {children}
          </main>
        </Providers>

        {/* Moved <noscript> fallback inside the body to prevent Next.js build errors */}
        <noscript>
          <Image
            {...getOptimizedImageProps(
              "https://www.facebook.com/tr?id=1120594359291706&ev=PageView&noscript=1",
            )}
            height={1}
            width={1}
            style={{ display: "none" }}
            alt="Facebook pixel tracking fallback"
            unoptimized
          />
        </noscript>
      </body>
    </html>
  );
}
