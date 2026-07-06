import { useCallback } from "react";

import { signUpWithEmail } from "../features/auth/services/auth.service";
import { useAuthContext } from "../providers/AuthProvider";

type SignUpPayload = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  birthDate: string;
  consentAccepted: boolean;
  phoneCountryCode?: string;
  phoneNumber?: string;
  inviteCode?: string;
};

export function useAuth() {
  const auth = useAuthContext();

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      const normalizedInviteCode = payload.inviteCode?.trim().toUpperCase();
      const result = await signUpWithEmail({
        displayName: payload.displayName,
        username: payload.username,
        email: payload.email,
        password: payload.password,
        birthDate: payload.birthDate,
        consentAccepted: payload.consentAccepted,
        ...(payload.phoneCountryCode?.trim() && payload.phoneNumber?.trim()
          ? {
              phoneCountryCode: payload.phoneCountryCode.trim(),
              phoneNumber: payload.phoneNumber.trim(),
            }
          : {}),
        ...(normalizedInviteCode ? { inviteCode: normalizedInviteCode } : {}),
      });

      if (!result.state?.user || !result.state?.session) {
        throw new Error("Sign up succeeded but auth state is missing.");
      }

      await auth.refreshSession();

      return { resumedPendingVerification: result.resumedPendingVerification };
    },
    [auth.refreshSession],
  );

  return {
    ...auth,
    signUp,
  };
}
