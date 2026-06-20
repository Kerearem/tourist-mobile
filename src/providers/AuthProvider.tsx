import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  completeEmailVerification as completeEmailVerificationService,
  completePhoneVerification as completePhoneVerificationService,
  hydrateAuthState,
  resendEmailCode as resendEmailCodeService,
  resendPhoneCode as resendPhoneCodeService,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
} from "../features/auth/services/auth.service";
import { completeOnboarding as completeOnboardingService } from "../features/onboarding/services/onboarding.service";
import type { AuthGateStatus, AuthSession } from "../models/auth";
import type { AppUser, RelocationReason, UserLanguage } from "../models/user";

type AuthContextValue = {
  user: AppUser | null;
  session: AuthSession | null;
  isBooting: boolean;
  gateStatus: AuthGateStatus;
  hasPhoneVerification: boolean;
  hasEmailVerification: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (payload: { identifier: string; password: string }) => Promise<void>;
  signUp: (payload: {
    displayName: string;
    username: string;
    phoneCountryCode: string;
    phoneNumber: string;
    email: string;
    password: string;
    birthDate: string;
    consentAccepted: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  completePhoneVerification: (code: string) => Promise<void>;
  completeEmailVerification: (code: string) => Promise<void>;
  resendPhoneCode: () => Promise<void>;
  resendEmailCode: () => Promise<void>;
  completeOnboarding: (payload: {
    nationalityCountryCode: string;
    homeCommunity: string;
    destinationCountryCode: string;
    destinationCity: string;
    currentCity: string;
    spokenLanguages: UserLanguage[];
    relocationReason: RelocationReason;
    interests: string[];
  }) => Promise<void>;
  updateAvatarUrl: (avatarUrl: string) => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const isOnboardingComplete = (user: AppUser | null) => {
  if (!user) {
    return false;
  }

  return Boolean(
    user.privateProfile.nationalityCountryCode &&
      user.publicProfile.homeCommunity &&
      user.privateProfile.destinationCountryCode &&
      user.privateProfile.destinationCity &&
      user.publicProfile.currentCity &&
      user.privateProfile.spokenLanguages.length > 0 &&
      user.privateProfile.spokenLanguages.every((language) => language.code && language.level) &&
      user.privateProfile.relocationReason !== null &&
      user.publicProfile.interests.length > 0,
  );
};

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

  if (!isOnboardingComplete(user)) {
    return "needs_onboarding";
  }

  return "ready";
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const signIn = useCallback(async ({ identifier, password }: { identifier: string; password: string }) => {
    const authState = await signInWithEmail({ identifier, password });
    setSession(authState.session);
    setUser(authState.user);
  }, []);

  const signUp = useCallback(
    async ({
      displayName,
      username,
      phoneCountryCode,
      phoneNumber,
      email,
      password,
      birthDate,
      consentAccepted,
    }: {
      displayName: string;
      username: string;
      phoneCountryCode: string;
      phoneNumber: string;
      email: string;
      password: string;
      birthDate: string;
      consentAccepted: boolean;
    }) => {
      const authState = await signUpWithEmail({
        displayName,
        username,
        phoneCountryCode,
        phoneNumber,
        email,
        password,
        birthDate,
        consentAccepted,
      });
      if (!authState?.user || !authState?.session) {
        throw new Error("Sign up succeeded but auth state is missing.");
      }
      setSession(authState.session);
      setUser(authState.user);
      console.log("[AuthProvider] signUp set state", {
        userId: authState.user.id,
        hasPhoneVerification: authState.user.hasPhoneVerification,
        hasEmailVerification: authState.user.hasEmailVerification,
      });
    },
    [],
  );

  const signOut = useCallback(async () => {
    await signOutSession();
    setSession(null);
    setUser(null);
  }, []);

  const completePhoneVerification = useCallback(
    async (code: string) => {
      if (!user) {
        return;
      }

      const updatedUser = await completePhoneVerificationService(user.id, code);
      setUser(updatedUser);
    },
    [user],
  );

  const completeEmailVerification = useCallback(
    async (code: string) => {
      if (!user) {
        return;
      }

      const updatedUser = await completeEmailVerificationService(user.id, code);
      setUser(updatedUser);
    },
    [user],
  );

  const resendPhoneCode = useCallback(async () => {
    await resendPhoneCodeService();
  }, []);

  const resendEmailCode = useCallback(async () => {
    await resendEmailCodeService();
  }, []);

  const completeOnboarding = useCallback(
    async ({
      nationalityCountryCode,
      homeCommunity,
      destinationCountryCode,
      destinationCity,
      currentCity,
      spokenLanguages,
      relocationReason,
      interests,
    }: {
      nationalityCountryCode: string;
      homeCommunity: string;
      destinationCountryCode: string;
      destinationCity: string;
      currentCity: string;
      spokenLanguages: UserLanguage[];
      relocationReason: RelocationReason;
      interests: string[];
    }) => {
      if (!user) {
        return;
      }

      const updatedUser = await completeOnboardingService({
        userId: user.id,
        nationalityCountryCode,
        homeCommunity,
        destinationCountryCode,
        destinationCity,
        currentCity,
        spokenLanguages,
        relocationReason,
        interests,
      });

      setUser(updatedUser);
    },
    [user],
  );

  const updateAvatarUrl = useCallback((avatarUrl: string) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        publicProfile: {
          ...current.publicProfile,
          avatarUrl,
        },
      };
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const authState = await hydrateAuthState();
      if (authState) {
        setSession(authState.session);
        setUser(authState.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.warn("[AuthProvider] refreshSession failed", error);
      setSession(null);
      setUser(null);
    } finally {
      setIsBooting(false);
    }
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

  useEffect(() => {
    console.log("[AuthProvider] gate state recalculated", {
      gateStatus,
      userId: user?.id ?? null,
      hasPhoneVerification: user?.hasPhoneVerification ?? null,
      hasEmailVerification: user?.hasEmailVerification ?? null,
    });
  }, [gateStatus, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isBooting,
      gateStatus,
      hasPhoneVerification: user?.hasPhoneVerification ?? false,
      hasEmailVerification: user?.hasEmailVerification ?? false,
      hasCompletedOnboarding: isOnboardingComplete(user),
      signIn,
      signUp,
      signOut,
      completePhoneVerification,
      completeEmailVerification,
      resendPhoneCode,
      resendEmailCode,
      completeOnboarding,
      updateAvatarUrl,
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
      resendPhoneCode,
      resendEmailCode,
      completeOnboarding,
      updateAvatarUrl,
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
