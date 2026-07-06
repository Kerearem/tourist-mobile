import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type SignupDraft = {
  firstName: string;
  lastName: string;
  displayName: string;
  birthDate: string;
  username: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  password: string;
  consentAccepted: boolean;
  inviteCode?: string;
};

type SignupDraftContextValue = {
  draft: SignupDraft;
  updateDraft: (patch: Partial<SignupDraft>) => void;
  resetDraft: () => void;
};

const initialDraft: SignupDraft = {
  firstName: "",
  lastName: "",
  displayName: "",
  birthDate: "",
  username: "",
  phoneCountryCode: "+90",
  phoneNumber: "",
  email: "",
  password: "",
  consentAccepted: false,
  inviteCode: "",
};

const SignupDraftContext = createContext<SignupDraftContextValue | null>(null);

export function SignupDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<SignupDraft>(initialDraft);

  const updateDraft = useCallback((patch: Partial<SignupDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialDraft);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      resetDraft,
    }),
    [draft, updateDraft, resetDraft],
  );

  return <SignupDraftContext.Provider value={value}>{children}</SignupDraftContext.Provider>;
}

export function useSignupDraft() {
  const context = useContext(SignupDraftContext);
  if (!context) {
    throw new Error("useSignupDraft must be used inside SignupDraftProvider.");
  }
  return context;
}
