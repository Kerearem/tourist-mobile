export const API_ENDPOINTS = {
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    signOut: "/auth/sign-out",
    me: "/auth/me",
    verifyPhone: "/auth/verify-phone",
    verifyEmail: "/auth/verify-email",
  },
  onboarding: {
    complete: "/onboarding/complete",
  },
} as const;
