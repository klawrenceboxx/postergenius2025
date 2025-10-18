import Link from "next/link";

const EmailConsentText = ({ className = "", linkClassName = "" }) => {
  const paragraphClassName = ["text-xs text-gray-500", className]
    .filter(Boolean)
    .join(" ");

  const inlineLinkClassName = ["text-gray-500 underline", linkClassName]
    .filter(Boolean)
    .join(" ");

  const policyLinkClassName = [
    "block text-xs text-gray-500 underline",
    linkClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1">
      <p className={paragraphClassName}>
        By subscribing, you agree to receive occasional updates and promotions.
        See our{" "}
        <Link href="/privacy" className={inlineLinkClassName}>
          Privacy Policy
        </Link>
        .
      </p>
      <Link href="/email-consent-policy" className={policyLinkClassName}>
        Read our full Email Consent Policy →
      </Link>
    </div>
  );
};

export default EmailConsentText;
