import Link from "next/link";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const EmailConsentPolicyPage = () => {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 text-gray-700">
        <header>
          <h1 className="text-3xl font-semibold text-gray-900">Email Consent Policy</h1>
          <p className="mt-4 text-base leading-relaxed">
            We value your trust. This page summarizes the consent you grant when
            you share your email address with PosterGenius.
          </p>
        </header>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">What you&apos;re agreeing to</h2>
          <p className="text-base leading-relaxed">
            By subscribing, you agree to receive occasional updates and
            promotions.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Where to learn more</h2>
          <p className="text-base leading-relaxed">
            See our
            {" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            {" "}
            for additional details on how we protect your information and honor
            your choices.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default EmailConsentPolicyPage;
