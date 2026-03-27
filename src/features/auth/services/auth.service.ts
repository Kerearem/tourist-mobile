import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AuthSession } from "../../../models/auth";
import type { AppUser } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { apiRequest } from "../../../services/api/client";
import { clearAuthState, loadAuthState, saveAuthState, saveCanonicalUser } from "../../../services/api/authSession";
import type { SessionTokens } from "../../../services/api/types";

type AuthPayload = {
  session: AuthSession;
  user: AppUser;
  tokens: SessionTokens;
};

type SignInInput = {
  email: string;
  password: string;
};

type SignUpInput = {
  displayName: string;
  email: string;
  password: string;
};

type HydratedAuthState = {
  session: AuthSession;
  user: AppUser;
};

const buildMockUser = (input: { id: string; displayName: string }): AppUser => ({
  id: input.id,
  displayName: input.displayName,
  community: "",
  homeCountryCode: "",
  currentCountryCode: "",
  currentCity: "",
  hasCompletedOnboarding: false,
  hasPhoneVerification: false,
  hasEmailVerification: false,
  organizerStatus: "not_applied",
});

const buildMockPayload = (input: { user: AppUser }): AuthPayload => {
  const now = new Date().toISOString();
  return {
    user: input.user,
    session: {
      sessionId: `session_${Date.now()}`,
      userId: input.user.id,
      createdAt: now,
    },
    tokens: {
      accessToken: `mock_access_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
    },
  };
};

const persistAuthPayload = async (payload: AuthPayload): Promise<HydratedAuthState> => {
  await saveAuthState(payload);
  return {
    session: payload.session,
    user: payload.user,
  };
};

export async function signInWithEmail(input: SignInInput): Promise<HydratedAuthState> {
  if (USE_MOCK_BACKEND) {
    const payload = buildMockPayload({
      user: buildMockUser({
        id: `user_${Date.now()}`,
        displayName: input.email.split("@")[0] || "Tourist User",
      }),
    });
    return persistAuthPayload(payload);
  }

  const payload = await apiRequest<AuthPayload>(API_ENDPOINTS.auth.signIn, {
    method: "POST",
    body: input,
  });

  return persistAuthPayload(payload);
}

export async function signUpWithEmail(input: SignUpInput): Promise<HydratedAuthState> {
  if (USE_MOCK_BACKEND) {
    const payload = buildMockPayload({
      user: buildMockUser({
        id: `user_${Date.now()}`,
        displayName: input.displayName.trim() || input.email.split("@")[0] || "Tourist User",
      }),
    });
    return persistAuthPayload(payload);
  }

  const payload = await apiRequest<AuthPayload>(API_ENDPOINTS.auth.signUp, {
    method: "POST",
    body: input,
  });

  return persistAuthPayload(payload);
}

export async function signOutSession(): Promise<void> {
  const state = await loadAuthState();

  if (!USE_MOCK_BACKEND && state?.tokens.accessToken) {
    await apiRequest<void>(API_ENDPOINTS.auth.signOut, {
      method: "POST",
      token: state.tokens.accessToken,
    });
  }

  await clearAuthState();
}

export async function hydrateAuthState(): Promise<HydratedAuthState | null> {
  const state = await loadAuthState();
  if (!state) {
    return null;
  }

  if (USE_MOCK_BACKEND) {
    return {
      session: state.session,
      user: state.user,
    };
  }

  const profile = await apiRequest<AppUser>(API_ENDPOINTS.auth.me, {
    method: "GET",
    token: state.tokens.accessToken,
  });

  await saveCanonicalUser(profile);

  return {
    session: state.session,
    user: profile,
  };
}

export async function completePhoneVerification(userId: string): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== userId) {
      throw new Error("No auth state found for phone verification.");
    }
    const user: AppUser = {
      ...state.user,
      hasPhoneVerification: true,
    };
    await saveCanonicalUser(user);
    return user;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  const user = await apiRequest<AppUser>(API_ENDPOINTS.auth.verifyPhone, {
    method: "POST",
    token: state.tokens.accessToken,
  });

  await saveCanonicalUser(user);
  return user;
}

export async function completeEmailVerification(userId: string): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== userId) {
      throw new Error("No auth state found for email verification.");
    }
    const user: AppUser = {
      ...state.user,
      hasEmailVerification: true,
    };
    await saveCanonicalUser(user);
    return user;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  const user = await apiRequest<AppUser>(API_ENDPOINTS.auth.verifyEmail, {
    method: "POST",
    token: state.tokens.accessToken,
  });

  await saveCanonicalUser(user);
  return user;
}
