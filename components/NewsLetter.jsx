import React from "react";
import Image from "next/image";
import bgImage from "@/public/subscribe now.jpg"; // adjust path based on your setup
import EmailConsentText from "@/components/EmailConsentText";

const NewsLetter = () => {
  return (
    <section className="relative w-full mb-6">
      {/* Background image */}
      <div className="absolute inset-0 -z-10 rounded-lg overflow-hidden">
        <Image
          src={bgImage}
          alt="Subscribe background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />{" "}
        {/* dark overlay for contrast */}
      </div>

      {/* Content aligned left */}
      <div className="flex flex-col items-start text-left space-y-4 max-w-xl px-6 md:px-12 py-16">
        <h1 className="md:text-4xl  lg:text-5xl text-2xl font-[700] text-white">
          Subscribe Now & Get 20% Off
        </h1>
        <p className="md:text-base text-sm text-gray-200/90 max-w-md">
          Join our newsletter for the latest discounts and Displate goodies.
        </p>

        <div className="flex items-center w-full md:max-w-lg">
          <input
            className="border border-gray-300 h-12 md:h-14 w-full px-4 text-gray-800 rounded-l-md outline-none"
            type="text"
            placeholder="Enter your email"
          />
          <button className="md:px-10 px-6 h-12 md:h-14 bg-primary text-white font-[700] rounded-r-md hover:bg-secondary transition">
            Subscribe
          </button>
        </div>
        <EmailConsentText
          className="mt-3 text-gray-200"
          linkClassName="text-gray-200 hover:text-white"
        />
      </div>
    </section>
  );
};

export default NewsLetter;
