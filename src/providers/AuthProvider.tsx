import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  const signIn = useCallback(async ({ email }: { email: string; password: string }) => {
    const now = new Date().toISOString();
    const userId = `user_${Date.now()}`;

    // Mock session + user setup for Phase 2 gate flow.
    setSession({
      sessionId: `session_${Date.now()}`,
      userId,
      createdAt: now,
    });
    setUser({
      id: userId,
      displayName: email.split("@")[0] || "Tourist User",
      community: "",
      homeCountryCode: "",
      currentCountryCode: "",
      currentCity: "",
      hasCompletedOnboarding: false,
      hasPhoneVerification: false,
      hasEmailVerification: false,
      organizerStatus: "not_applied",
    });
  }, []);

  const signUp = useCallback(
    async ({ displayName, email }: { displayName: string; email: string; password: string }) => {
      const now = new Date().toISOString();
      const userId = `user_${Date.now()}`;

      setSession({
        sessionId: `session_${Date.now()}`,
        userId,
        createdAt: now,
      });
      setUser({
        id: userId,
        displayName: displayName.trim() || email.split("@")[0] || "Tourist User",
        community: "",
        homeCountryCode: "",
        currentCountryCode: "",
        currentCity: "",
        hasCompletedOnboarding: false,
        hasPhoneVerification: false,
        hasEmailVerification: false,
        organizerStatus: "not_applied",
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
  }, []);

  const completePhoneVerification = useCallback(async () => {
    setUser((currentUser) => {
      if (!currentUser) {
        return null;
      }

      return {
        ...currentUser,
        hasPhoneVerification: true,
      };
    });
  }, []);

  const completeEmailVerification = useCallback(async () => {
    setUser((currentUser) => {
      if (!currentUser) {
        return null;
      }

      return {
        ...currentUser,
        hasEmailVerification: true,
      };
    });
  }, []);

  const completeOnboarding = useCallback(async ({ community, country, city }: { community: string; country: string; city: string }) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return null;
      }

      return {
        ...currentUser,
        community: community.trim(),
        currentCountryCode: country.trim(),
        currentCity: city.trim(),
        hasCompletedOnboarding: true,
      };
    });
  }, []);

  const refreshSession = useCallback(async () => {
    // TODO: Hydrate session + user from secure storage/backends in later phases.
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
