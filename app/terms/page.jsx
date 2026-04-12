"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const TermsPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 md:px-10 lg:px-0">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Terms of Use / Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: April 11, 2026</p>
        </div>

        <p className="text-base leading-relaxed text-gray-600">
          These Terms of Use and Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your
          access to and use of PosterGenius, including postergenius.ca, your
          customer account, guest checkout, digital downloads, physical print
          purchases, and related services. By accessing the site or placing an
          order, you agree to be bound by these Terms.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">1. Who We Are</h2>
          <p className="text-base leading-relaxed text-gray-600">
            PosterGenius (&ldquo;PosterGenius&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
            &ldquo;us&rdquo;) operates an online storefront offering digital poster
            downloads and physical poster prints. If you have questions about these
            Terms, you may contact us at{" "}
            <a href="mailto:support@postergenius.ca" className="text-blue-600 underline">
              support@postergenius.ca
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">2. Eligibility and Use of the Site</h2>
          <p className="text-base leading-relaxed text-gray-600">
            You may use PosterGenius only if you can form a legally binding
            agreement under applicable law. You agree not to misuse the website,
            interfere with its operation, attempt unauthorized access to customer
            data, scrape protected content, or use the site for any unlawful,
            fraudulent, or abusive purpose.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">3. Accounts and Guest Checkout</h2>
          <p className="text-base leading-relaxed text-gray-600">
            You may purchase from PosterGenius either as a signed-in user or as a
            guest. If you create an account, you are responsible for maintaining the
            confidentiality of your login credentials and for all activity under your
            account. If you use guest checkout, you are responsible for providing
            accurate contact information so we can process your order, provide access
            to downloads, and send fulfillment or order-status updates.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">4. Product Information</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We aim to display product information, pricing, artwork previews, print
            sizes, and descriptions as accurately as possible. However, colors,
            textures, framing appearance, and mockups may vary depending on your
            device, screen, and production output. Product images and staged room
            previews are intended for illustration and may not represent the exact
            printed scale in your environment.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">5. Digital Products</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Digital poster purchases provide a limited, non-transferable license for
            your personal, non-commercial use only. Unless we expressly state
            otherwise in writing, you may not resell, redistribute, sublicense,
            upload, share publicly, use for merchandise, use in commercial design
            work, or claim ownership of the digital artwork. Digital files are
            delivered through your order access page and may also be made available
            through transactional communications where configured.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">6. Physical Prints and Fulfillment</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Physical print orders are fulfilled through third-party print and
            logistics partners. Production times, shipping estimates, and tracking
            availability may vary based on destination, order volume, stock, and
            carrier conditions. Delivery estimates are not guaranteed delivery dates.
            You are responsible for providing a complete and accurate shipping
            address. We are not responsible for delays, failed delivery, or
            additional fees caused by incorrect address details entered at checkout.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">7. Pricing, Payments, and Taxes</h2>
          <p className="text-base leading-relaxed text-gray-600">
            All prices are listed in the currency displayed on the site and may be
            changed at any time before an order is placed. Taxes, shipping charges,
            and promotional discounts are calculated at checkout where applicable.
            Payments are processed securely by third-party payment providers such as
            Stripe. We do not store your full payment card details.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">8. Promotions and Discount Codes</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Promo codes, discounts, and special offers may be limited by time,
            inventory, customer eligibility, product category, or minimum purchase
            amount. Unless explicitly stated otherwise, promo codes cannot be
            combined, may not apply to all items, and may be changed or withdrawn at
            any time. We reserve the right to cancel or refuse discounts in cases of
            misuse, abuse, fraud, or technical error.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">9. Order Acceptance and Cancellation</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Your order is not finally accepted until payment is successfully
            processed and we have begun fulfillment or made the digital product
            available. We reserve the right to cancel, refuse, or limit any order in
            cases including suspected fraud, pricing errors, duplicate transactions,
            fulfillment issues, policy violations, or circumstances outside our
            control. If we cancel an order after payment has been captured, we will
            issue an appropriate refund to the original payment method.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">10. Refunds, Returns, and Damaged Orders</h2>
          <p className="text-base leading-relaxed text-gray-600">
            Because digital downloads are delivered immediately or made available on
            demand, digital purchases are generally non-refundable once access has
            been provided, except where required by law. Physical print issues such
            as damage in transit, defective printing, or fulfillment mistakes should
            be reported promptly with your order number and supporting photos where
            relevant. Approved remedies may include replacement, store credit, or
            refund, depending on the circumstances.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">11. Intellectual Property</h2>
          <p className="text-base leading-relaxed text-gray-600">
            All site content, including artwork, branding, text, page design,
            layouts, logos, product copy, graphics, and software elements, is owned
            by PosterGenius or its licensors and is protected by intellectual
            property laws. Except for the limited consumer rights expressly granted
            in these Terms, no rights are transferred to you. You may not copy,
            reproduce, modify, distribute, frame, mirror, republish, or exploit our
            content without prior written permission.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">12. User Conduct</h2>
          <p className="text-base leading-relaxed text-gray-600">
            You agree not to submit false information, impersonate another person,
            attempt chargebacks in bad faith, interfere with platform security,
            upload malicious code, abuse reviews or customer support, or use
            PosterGenius in a way that could harm other customers, our service
            providers, or our business operations.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">13. Third-Party Services</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We rely on third-party providers for authentication, payments, print
            fulfillment, email delivery, media hosting, analytics, and related site
            operations. Your use of services provided by Stripe, Clerk, Printful, or
            similar providers may also be subject to their own terms and policies. We
            are not responsible for outages, delays, or service interruptions caused
            by third-party providers outside our reasonable control.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">14. Disclaimer of Warranties</h2>
          <p className="text-base leading-relaxed text-gray-600">
            PosterGenius is provided on an &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; basis. To the maximum extent permitted by law, we make
            no warranties, express or implied, regarding uninterrupted access,
            compatibility, merchantability, fitness for a particular purpose, or
            non-infringement. We do not guarantee that the site will always be error
            free, secure, or continuously available.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">15. Limitation of Liability</h2>
          <p className="text-base leading-relaxed text-gray-600">
            To the maximum extent permitted by law, PosterGenius and its affiliates,
            officers, employees, contractors, and service providers will not be
            liable for any indirect, incidental, consequential, special, exemplary,
            or punitive damages, including lost profits, lost revenue, lost data, or
            business interruption, arising from your use of the site or purchase of
            products. Our total aggregate liability for any claim relating to an
            order or use of the service will not exceed the amount you paid for the
            specific order giving rise to the claim.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">16. Indemnification</h2>
          <p className="text-base leading-relaxed text-gray-600">
            You agree to indemnify and hold harmless PosterGenius from claims,
            damages, liabilities, costs, and expenses arising from your misuse of the
            site, your breach of these Terms, your violation of applicable law, or
            your infringement of the rights of any third party.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">17. Governing Law</h2>
          <p className="text-base leading-relaxed text-gray-600">
            These Terms are governed by the laws of the Province of Ontario and the
            applicable federal laws of Canada, without regard to conflict-of-law
            principles. You agree that disputes arising under these Terms will be
            brought before the courts having jurisdiction in Ontario, unless
            applicable consumer law requires otherwise.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">18. Changes to These Terms</h2>
          <p className="text-base leading-relaxed text-gray-600">
            We may update these Terms from time to time. When we do, we will update
            the &ldquo;Last updated&rdquo; date above. Continued use of PosterGenius
            after an update becomes effective constitutes your acceptance of the
            revised Terms.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-gray-800">19. Contact</h2>
          <p className="text-base leading-relaxed text-gray-600">
            If you have questions about these Terms, contact us at{" "}
            <a href="mailto:support@postergenius.ca" className="text-blue-600 underline">
              support@postergenius.ca
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default TermsPage;
