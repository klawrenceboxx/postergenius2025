"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const PrivacyPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 md:px-10 lg:px-0">
        <h1 className="text-3xl font-semibold text-gray-900">Privacy Policy</h1>
        <p className="text-base leading-relaxed text-gray-600">
          This is a placeholder for the PosterGenius privacy policy. Detailed
          information about how we collect, use, and protect your data will be
          added soon.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPage;
