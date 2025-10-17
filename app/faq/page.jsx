import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Frequently Asked Questions | PosterGenius",
  description:
    "Answers to common questions about PosterGenius orders, shipping, and product care.",
};

const faqs = [
  {
    question: "What makes PosterGenius prints unique?",
    answer: [
      "Every poster is designed in-house by our creative team and printed on archival-quality paper for a gallery-grade finish.",
      "We collaborate with illustrators, gamers, and pop-culture enthusiasts to ensure each design feels personal and original.",
    ],
  },
  {
    question: "How long will it take to receive my order?",
    answer: [
      "Most orders ship within 3-5 business days. You will receive tracking information as soon as your poster leaves our studio.",
      "International shipping times vary by carrier, but we keep you updated at every milestone so there are no surprises.",
    ],
  },
  {
    question: "Can I request a custom size or framing option?",
    answer: [
      "Absolutely! Reach out through our contact form with the dimensions you have in mind.",
      "Our team will confirm availability, share a quote, and help you find the best finish for your space.",
    ],
  },
  {
    question: "What is your return policy?",
    answer: [
      "If your poster arrives damaged, we will replace it right away—just send us a photo within 14 days of delivery.",
      "For other concerns, contact our support team. We’re committed to ensuring you love every piece you hang.",
    ],
  },
  {
    question: "How should I care for my posters?",
    answer: [
      "Avoid direct sunlight and high humidity for the longest life. We recommend framing posters with UV-protective glass whenever possible.",
      "Use clean, dry hands when handling your print and store it flat if you’re not ready to display it yet.",
    ],
  },
];

const FAQPage = () => {
  return (
    <>
      <Navbar />
      <main className="bg-gray-50 text-gray-900">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16 md:px-16 lg:px-24">
          <header className="flex flex-col items-start gap-4 text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
              Support
            </p>
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Frequently Asked Questions
            </h1>
            <p className="max-w-2xl text-base text-gray-600">
              Find quick answers about orders, shipping, and caring for your
              posters. Still curious? Our team is only a message away.
            </p>
          </header>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-secondary/60 hover:shadow-md"
                defaultOpen={index === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left">
                  <span className="text-lg font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <svg
                    className="h-5 w-5 shrink-0 text-secondary transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.164l3.71-3.934a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-base leading-relaxed text-gray-600">
                  <div className="space-y-3">
                    {faq.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          <footer className="rounded-2xl border border-dashed border-secondary/40 bg-secondary/5 px-6 py-6 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Need more help?</p>
            <p>
              Send us a note at
              <a
                className="ml-2 font-semibold text-secondary underline decoration-2 underline-offset-4"
                href="mailto:support@postergenius.dev"
              >
                support@postergenius.dev
              </a>
              —we respond within one business day.
            </p>
          </footer>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default FAQPage;
