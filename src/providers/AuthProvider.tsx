import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  completeEmailVerification as completeEmailVerificationService,
  completePhoneVerification as completePhoneVerificationService,
  hydrateAuthState,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
} from "../features/auth/services/auth.service";
import { completeOnboarding as completeOnboardingService } from "../features/onboarding/services/onboarding.service";
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
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: { displayName: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  completePhoneVerification: () => Promise<void>;
  completeEmailVerification: () => Promise<void>;
  completeOnboarding: (payload: { community: string; country: string; city: string }) => Promise<void>;
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
  const [isBooting, setIsBooting] = useState(true);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const authState = await signInWithEmail({ email, password });
    setSession(authState.session);
    setUser(authState.user);
  }, []);

  const signUp = useCallback(
    async ({ displayName, email, password }: { displayName: string; email: string; password: string }) => {
      const authState = await signUpWithEmail({
        displayName,
        email,
        password,
      });
      setSession(authState.session);
      setUser(authState.user);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await signOutSession();
    setSession(null);
    setUser(null);
  }, []);

  const completePhoneVerification = useCallback(async () => {
    if (!user) {
      return;
    }

    const updatedUser = await completePhoneVerificationService(user.id);
    setUser(updatedUser);
  }, [user]);

  const completeEmailVerification = useCallback(async () => {
    if (!user) {
      return;
    }

    const updatedUser = await completeEmailVerificationService(user.id);
    setUser(updatedUser);
  }, [user]);

  const completeOnboarding = useCallback(
    async ({ community, country, city }: { community: string; country: string; city: string }) => {
      if (!user) {
        return;
      }

      const updatedUser = await completeOnboardingService({
        userId: user.id,
        community,
        country,
        city,
      });

      setUser(updatedUser);
    },
    [user],
  );

  const refreshSession = useCallback(async () => {
    const authState = await hydrateAuthState();
    if (authState) {
      setSession(authState.session);
      setUser(authState.user);
    } else {
      setSession(null);
      setUser(null);
    }
    setIsBooting(false);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

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
      signUp,
      signOut,
      completePhoneVerification,
      completeEmailVerification,
      completeOnboarding,
      refreshSession,
    }),
    [
      user,
      session,
      isBooting,
      gateStatus,
      signIn,
      signUp,
      signOut,
      completePhoneVerification,
      completeEmailVerification,
      completeOnboarding,
      refreshSession,
    ],
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
