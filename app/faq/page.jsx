"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const FaqPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 md:px-10 lg:px-0">
        <h1 className="text-3xl font-semibold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-base leading-relaxed text-gray-600">
          Our FAQ section is coming soon. It will cover shipping, returns, and
          everything else you need to know about PosterGenius products and
          services.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default FaqPage;
