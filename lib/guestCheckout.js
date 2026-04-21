export const GUEST_CONTACT_FIELDS = ["fullName", "email", "phone"];

export const GUEST_ADDRESS_FIELDS = [
  "street",
  "city",
  "province",
  "postalCode",
  "country",
];

export const GUEST_CHECKOUT_REQUIRED_FIELDS = [
  ...GUEST_CONTACT_FIELDS,
  ...GUEST_ADDRESS_FIELDS,
];

export function getRequiredFields(isDigitalOnly = false) {
  return isDigitalOnly ? GUEST_CONTACT_FIELDS : GUEST_CHECKOUT_REQUIRED_FIELDS;
}

export function hasRequiredGuestCheckoutDetails(values = {}, { isDigitalOnly = false } = {}) {
  return getRequiredFields(isDigitalOnly).every((field) =>
    String(values?.[field] || "").trim()
  );
}

export function validateGuestCheckoutDetails(
  values = {},
  { acceptPolicies = false, requirePolicies = false, isDigitalOnly = false } = {}
) {
  const errors = {};

  getRequiredFields(isDigitalOnly).forEach((field) => {
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
