export const SIGNUP_FLOW_TOTAL_STEPS = 8;

export const SIGNUP_FLOW_STEPS = {
  displayName: 1,
  birthDate: 2,
  username: 3,
  account: 4,
  emailVerification: 5,
  community: 6,
  country: 7,
  city: 8,
  /** Reserved for optional phone verification (SMS not required at signup). */
  phoneVerification: 5,
} as const;
