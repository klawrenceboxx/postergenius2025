"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const TermsPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 md:px-10 lg:px-0">
        <h1 className="text-3xl font-semibold text-gray-900">Terms &amp; Conditions</h1>
        <p className="text-base leading-relaxed text-gray-600">
          This page will soon outline the PosterGenius terms and conditions,
          including purchasing policies, user responsibilities, and service
          guidelines.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default TermsPage;
