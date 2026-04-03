"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const PrivacyPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 md:px-10 lg:px-0">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: March 28, 2026</p>
        </div>

        <p className="text-base leading-relaxed text-gray-600">
          PosterGenius (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates postergenius.ca. This Privacy Policy explains
          how we collect, use, and protect your information when you visit our website or make a purchase.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">1. Information We Collect</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We collect information you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 text-base leading-relaxed text-gray-600">
            <li>Name, email address, and password when you create an account</li>
            <li>Shipping address and billing information when placing an order</li>
            <li>Payment information processed securely through Stripe (we do not store card details)</li>
            <li>Communications you send us (e.g., support requests)</li>
          </ul>
          <p className="text-base leading-relaxed text-gray-600">
            We also automatically collect certain information when you visit our site, including IP address,
            browser type, referring URLs, and pages visited, via standard web analytics tools.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-base leading-relaxed text-gray-600">
            <li>To process and fulfill your orders (digital downloads and physical prints)</li>
            <li>To send order confirmations and shipping updates</li>
            <li>To send marketing emails if you have opted in (you can unsubscribe at any time)</li>
            <li>To improve our website and product offerings</li>
            <li>To prevent fraud and ensure security</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">3. Sharing Your Information</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We do not sell your personal information. We share your data only with trusted third-party
            service providers necessary to operate our business:
          </p>
          <ul className="list-disc pl-6 text-base leading-relaxed text-gray-600">
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Printful</strong> — fulfillment and shipping of physical orders (requires your name and shipping address)</li>
            <li><strong>Clerk</strong> — account authentication</li>
            <li><strong>AWS S3</strong> — secure delivery of digital downloads</li>
            <li><strong>Omnisend</strong> — marketing email platform</li>
            <li><strong>Cloudinary</strong> — image hosting</li>
          </ul>
          <p className="text-base leading-relaxed text-gray-600">
            All service providers are contractually required to protect your data and may only use it
            to provide services on our behalf.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">4. Cookies</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We use cookies and similar technologies to maintain your session, remember your cart, and
            understand how visitors use our site. You can disable cookies in your browser settings,
            though some features of the site may not function correctly without them.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">5. Data Retention</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We retain your personal information for as long as necessary to fulfill the purposes
            described in this policy, comply with legal obligations, resolve disputes, and enforce
            our agreements. Order records are retained for a minimum of 7 years for accounting
            and tax compliance purposes.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">6. Your Rights</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc pl-6 text-base leading-relaxed text-gray-600">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Withdraw consent for marketing communications at any time</li>
            <li>Lodge a complaint with your local data protection authority</li>
          </ul>
          <p className="text-base leading-relaxed text-gray-600">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@postergenius.ca" className="text-blue-600 underline">
              support@postergenius.ca
            </a>.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">7. Children&apos;s Privacy</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Our services are not directed to children under the age of 13. We do not knowingly
            collect personal information from children. If you believe we have inadvertently
            collected such information, please contact us and we will delete it promptly.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">8. Security</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We implement industry-standard security measures including HTTPS encryption, secure
            payment processing via Stripe, and access controls to protect your personal information.
            No method of transmission over the internet is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">9. Changes to This Policy</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We may update this Privacy Policy from time to time. When we do, we will update the
            &ldquo;last updated&rdquo; date at the top of this page. We encourage you to review this
            policy periodically.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">10. Contact Us</h2>
          <p className="text-base leading-relaxed text-gray-600">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <ul className="list-none text-base leading-relaxed text-gray-600">
            <li>Email: <a href="mailto:support@postergenius.ca" className="text-blue-600 underline">support@postergenius.ca</a></li>
            <li>Website: <a href="https://postergenius.ca" className="text-blue-600 underline">postergenius.ca</a></li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default PrivacyPage;
