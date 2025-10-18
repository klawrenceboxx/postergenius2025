"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About Us | PosterGenius",
  description:
    "Learn how PosterGenius blends storytelling and design to deliver art prints and posters for passionate fans.",
  alternates: { canonical: "https://postergenius.ca/about-us" },
  openGraph: {
    title: "About Us | PosterGenius",
    description:
      "Learn how PosterGenius blends storytelling and design to deliver art prints and posters for passionate fans.",
    url: "https://postergenius.ca/about-us",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | PosterGenius",
    description:
      "Learn how PosterGenius blends storytelling and design to deliver art prints and posters for passionate fans.",
  },
};

const AboutPage = () => {
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-start px-6 md:px-16 lg:px-32">
        <div className="flex flex-col items-end pt-12">
          <h1 className="text-2xl font-medium">About Us | PosterGenius</h1>
          <div className="w-16 h-0.5 bg-primary rounded-full"></div>
        </div>

        <div className="mt-12 max-w-4xl text-gray-700 text-base leading-relaxed space-y-8">
          <p>
            At <span className="font-semibold text-gray-900">PosterGenius</span>
            , we believe that walls shouldn’t be boring. Born from a passion for
            storytelling and bold design, we bring characters, places, and ideas
            to life—one poster at a time.
          </p>

          <p>
            Whether you&apos;re a gamer, dreamer, or designer, our mission is to help
            you express your identity through art that speaks louder than words.
            We specialize in unique prints that blend pop culture, minimalism,
            and emotional storytelling—all crafted for creators, collectors, and
            fans alike.
          </p>

          <p>
            Built on creativity, honesty, and community, PosterGenius is more
            than a store—it&apos;s a canvas for people who care about meaningful
            design. Every product we offer is part of a journey to spark
            curiosity, inspiration, or even just a smile.
          </p>
        </div>

        {/* Optional section with imagery */}
        {/* <div className="mt-16 w-full grid md:grid-cols-3 gap-8">
                    <img src="/about1.jpg" alt="Studio" className="rounded-lg w-full h-auto object-cover" />
                    <img src="/about2.jpg" alt="Print Process" className="rounded-lg w-full h-auto object-cover" />
                    <img src="/about3.jpg" alt="Team" className="rounded-lg w-full h-auto object-cover" />
                </div> */}

        <div className="mt-20 text-center w-full text-gray-600 text-sm">
          <p>
            Got questions or just want to connect? Reach out anytime at{" "}
            <a
              href="mailto:contact@postergenius.dev"
              className="text-secondary underline"
            >
              contact@postergenius.dev
            </a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AboutPage;
