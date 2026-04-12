export const GUEST_CHECKOUT_REQUIRED_FIELDS = [
  "fullName",
  "email",
  "phone",
  "street",
  "city",
  "province",
  "postalCode",
  "country",
];

export function hasRequiredGuestCheckoutDetails(values = {}) {
  return GUEST_CHECKOUT_REQUIRED_FIELDS.every((field) =>
    String(values?.[field] || "").trim()
  );
}

export function validateGuestCheckoutDetails(
  values = {},
  { acceptPolicies = false, requirePolicies = false } = {}
) {
  const errors = {};

  GUEST_CHECKOUT_REQUIRED_FIELDS.forEach((field) => {
    if (!String(values?.[field] || "").trim()) {
      errors[field] = "Required";
    }
  });

  const email = String(values?.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email";
  }

  if (requirePolicies && !acceptPolicies) {
    errors.acceptPolicies = "You must accept the terms and privacy policy";
  }

  return errors;
}
