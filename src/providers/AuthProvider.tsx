import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { AuthGateStatus, AuthSession } from "../models/auth";
import type { AppUser } from "../models/user";

type AuthContextValue = {
  user: AppUser | null;
  session: AuthSession | null;
  isBooting: boolean;
  gateStatus: AuthGateStatus;
  hasPhoneVerification: boolean;
  hasEmailVerification: boolean;
  hasCompletedOnboarding: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const buildGateStatus = ({
  isBooting,
  user,
}: {
  isBooting: boolean;
  user: AppUser | null;
}): AuthGateStatus => {
  if (isBooting) {
    return "booting";
  }

  if (!user) {
    return "signed_out";
  }

  if (!user.hasPhoneVerification) {
    return "needs_phone_verification";
  }

  if (!user.hasEmailVerification) {
    return "needs_email_verification";
  }

  if (!user.hasCompletedOnboarding) {
    return "needs_onboarding";
  }

  return "ready";
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBooting, setIsBooting] = useState(false);

  const signIn = useCallback(async () => {
    // TODO: Connect sign-in to real auth service in a later phase.
    setSession(null);
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    // TODO: Clear remote and local auth state in a later phase.
    setSession(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    // TODO: Hydrate auth/session/profile from backend + secure storage.
    setIsBooting(false);
  }, []);

  const gateStatus = useMemo(
    () =>
      buildGateStatus({
        isBooting,
        user,
      }),
    [isBooting, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isBooting,
      gateStatus,
      hasPhoneVerification: user?.hasPhoneVerification ?? false,
      hasEmailVerification: user?.hasEmailVerification ?? false,
      hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
      signIn,
      signOut,
      refreshSession,
    }),
    [user, session, isBooting, gateStatus, signIn, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }
  return context;
}
