import { USE_MOCK_BACKEND } from "../../../constants/env";
import type { AuthSession } from "../../../models/auth";
import type { AppUser } from "../../../models/user";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { ApiRequestError, apiRequest } from "../../../services/api/client";
import {
  clearAuthState,
  getMockUserRegistryUser,
  loadAuthState,
  saveAuthState,
  saveCanonicalUser,
} from "../../../services/api/authSession";
import { getSecureItem, setSecureItem } from "../../../services/storage/secureStorage";
import type { SessionTokens } from "../../../services/api/types";

export type AuthPayload = {
  session: AuthSession;
  user: AppUser;
  tokens: SessionTokens;
  signupMeta?: {
    resumedPendingVerification?: boolean;
  };
};

export type SignUpResult = {
  state: HydratedAuthState;
  resumedPendingVerification?: boolean;
};

export const ACCOUNT_PENDING_DELETION_CODE = "ACCOUNT_PENDING_DELETION";

export class AccountPendingDeletionError extends Error {
  readonly identifier: string;
  readonly password: string;

  constructor(identifier: string, password: string) {
    super("Hesabın silinmek üzere. Geri getirmek ister misin?");
    this.name = "AccountPendingDeletionError";
    this.identifier = identifier;
    this.password = password;
  }
}

const parseAuthPayload = (payload: AuthPayload): AuthPayload => {
  if (!payload?.user?.id || !payload?.session?.sessionId || !payload?.tokens?.accessToken) {
    throw new Error("Invalid auth response from server.");
  }
  return payload;
};

type SignInInput = {
  identifier: string;
  password: string;
};

type SignUpInput = {
  displayName: string;
  username: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  email: string;
  password: string;
  birthDate: string;
  consentAccepted: boolean;
};

const buildSignUpRequestBody = (input: SignUpInput) => {
  const phoneCountryCode = input.phoneCountryCode?.trim();
  const phoneNumber = input.phoneNumber?.trim();

  return {
    displayName: input.displayName,
    username: input.username,
    email: input.email,
    password: input.password,
    birthDate: input.birthDate,
    consentAccepted: input.consentAccepted,
    ...(phoneCountryCode && phoneNumber ? { phoneCountryCode, phoneNumber } : {}),
  };
};

type HydratedAuthState = {
  session: AuthSession;
  user: AppUser;
};

type MockCredentialRecord = {
  email: string;
  password: string;
  userId: string;
};

const MOCK_TEST_USERS = [
  {
    id: "user_test_tourist",
    displayName: "Test Tourist",
    username: "testtourist",
    login: "test@tourist.com",
    phoneCountryCode: "+90",
    phoneNumber: "5555555555",
    password: "123456",
  },
] as const;
const MOCK_CREDENTIALS_KEY = "tourist.mock.auth.credentials";

const buildMockUser = (input: {
  id: string;
  displayName: string;
  username: string;
  email: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  birthDate: string;
  consentAccepted: boolean;
  hasPhoneVerification?: boolean;
  hasEmailVerification?: boolean;
  onboardingComplete?: boolean;
}): AppUser => {
  const now = new Date().toISOString();
  const user: AppUser = {
    id: input.id,
    roles: ["user"],
    organizerStatus: "not_applied",
    hasPhoneVerification: input.hasPhoneVerification ?? false,
    hasEmailVerification: input.hasEmailVerification ?? false,
    consentAccepted: input.consentAccepted,
    isUsernameSet: Boolean(input.username.trim()),
    createdAt: now,
    updatedAt: now,
    publicProfile: {
      displayName: input.displayName,
      username: input.username,
      usernameLower: input.username.toLowerCase(),
      homeCommunity: input.onboardingComplete ? "Turkish" : "",
      currentCity: input.onboardingComplete ? "Berlin" : "",
      interests: input.onboardingComplete ? ["Food", "Networking"] : [],
    },
    privateProfile: {
      email: input.email,
      ...(input.phoneCountryCode && input.phoneNumber
        ? { phoneCountryCode: input.phoneCountryCode, phoneNumber: input.phoneNumber }
        : {}),
      birthDate: input.birthDate,
      nationalityCountryCode: input.onboardingComplete ? "TR" : "",
      destinationCountryCode: input.onboardingComplete ? "DE" : "",
      destinationCity: input.onboardingComplete ? "Berlin" : "",
      relocationReason: input.onboardingComplete ? "work" : null,
      spokenLanguages: input.onboardingComplete
        ? [
            { code: "tr", level: "native" },
            { code: "en", level: "advanced" },
          ]
        : [],
    },
  };

  return user;
};

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

const findMockTestUser = (input: SignInInput) => {
  const normalizedIdentifier = input.identifier.trim().toLowerCase();
  const normalizedPhone = input.identifier.trim();

  return MOCK_TEST_USERS.find(
    (user) =>
      input.password === user.password &&
      (normalizedIdentifier === user.login.toLowerCase() ||
        normalizedIdentifier === user.username.toLowerCase() ||
        normalizedPhone === `${user.phoneCountryCode}${user.phoneNumber}`),
  );
};

const loadMockCredentials = async (): Promise<MockCredentialRecord[]> => {
  const raw = await getSecureItem(MOCK_CREDENTIALS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as MockCredentialRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (record) =>
        typeof record?.email === "string" && typeof record?.password === "string" && typeof record?.userId === "string",
    );
  } catch {
    return [];
  }
};

const saveMockCredentials = async (records: MockCredentialRecord[]): Promise<void> => {
  await setSecureItem(MOCK_CREDENTIALS_KEY, JSON.stringify(records));
};

const upsertMockCredential = async (record: MockCredentialRecord): Promise<void> => {
  const records = await loadMockCredentials();
  const nextRecords = records.filter((item) => item.email !== record.email);
  nextRecords.push(record);
  await saveMockCredentials(nextRecords);
};

const persistAuthPayload = async (payload: AuthPayload): Promise<HydratedAuthState> => {
  const { signupMeta: _signupMeta, ...authState } = payload;
  await saveAuthState(authState);
  const hydrated = await loadAuthState();
  console.log("[auth.service] Persisted auth state after signup/signin", {
    hasSession: Boolean(hydrated?.session),
    hasUser: Boolean(hydrated?.user),
    userId: hydrated?.user?.id ?? null,
    hasPhoneVerification: hydrated?.user?.hasPhoneVerification ?? null,
    hasEmailVerification: hydrated?.user?.hasEmailVerification ?? null,
  });
  return {
    session: authState.session,
    user: authState.user,
  };
};

export async function signInWithEmail(input: SignInInput): Promise<HydratedAuthState> {
  if (USE_MOCK_BACKEND) {
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    const mockCredentials = await loadMockCredentials();
    const matchedCredentialByEmail = mockCredentials.find(
      (credential) => credential.email === normalizedIdentifier && credential.password === input.password,
    );
    let matchedCredential = matchedCredentialByEmail ?? null;
    let matchedStoredUser: AppUser | null = null;

    if (!matchedCredential) {
      for (const credential of mockCredentials) {
        if (credential.password !== input.password) {
          continue;
        }
        const storedUser = await getMockUserRegistryUser(credential.userId);
        const usernameLower = storedUser?.publicProfile.usernameLower?.toLowerCase() ?? "";
        const username = storedUser?.publicProfile.username?.toLowerCase() ?? "";
        if (storedUser && (usernameLower === normalizedIdentifier || username === normalizedIdentifier)) {
          matchedCredential = credential;
          matchedStoredUser = storedUser;
          break;
        }
      }
    }

    if (matchedCredential) {
      const storedUser = matchedStoredUser ?? (await getMockUserRegistryUser(matchedCredential.userId));
      if (!storedUser) {
        throw new Error("Saved user record is missing. Please sign up again.");
      }
      const payload = buildMockPayload({
        user: storedUser,
      });
      return persistAuthPayload(payload);
    }

    const matchedUser = findMockTestUser(input);

    if (matchedUser) {
      const readyUser = buildMockUser({
        id: matchedUser.id,
        displayName: matchedUser.displayName,
        username: matchedUser.username,
        email: matchedUser.login,
        phoneCountryCode: matchedUser.phoneCountryCode,
        phoneNumber: matchedUser.phoneNumber,
        birthDate: "1998-06-14",
        consentAccepted: true,
        hasPhoneVerification: true,
        hasEmailVerification: true,
        onboardingComplete: true,
      });

      const payload = buildMockPayload({
        user: readyUser,
      });
      return persistAuthPayload(payload);
    }

    throw new Error("Invalid email/username or password.");
  }

  try {
    const payload = parseAuthPayload(
      await apiRequest<AuthPayload>(API_ENDPOINTS.auth.signIn, {
        method: "POST",
        body: {
          identifier: input.identifier,
          password: input.password,
        },
      }),
    );

    return persistAuthPayload(payload);
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      error.status === 409 &&
      error.code === ACCOUNT_PENDING_DELETION_CODE
    ) {
      throw new AccountPendingDeletionError(input.identifier, input.password);
    }
    throw error;
  }
}

export async function requestRestoreAccount(input: SignInInput): Promise<{ email: string }> {
  if (USE_MOCK_BACKEND) {
    return { email: "t***@tourist.com" };
  }

  const result = await apiRequest<{ success: boolean; email: string }>(API_ENDPOINTS.auth.restoreAccountRequest, {
    method: "POST",
    body: {
      identifier: input.identifier,
      password: input.password,
    },
  });

  return { email: result.email };
}

export async function verifyRestoreAccount(input: SignInInput & { code: string }): Promise<HydratedAuthState> {
  if (USE_MOCK_BACKEND) {
    return signInWithEmail(input);
  }

  const payload = parseAuthPayload(
    await apiRequest<AuthPayload>(API_ENDPOINTS.auth.restoreAccountVerify, {
      method: "POST",
      body: {
        identifier: input.identifier,
        password: input.password,
        code: input.code,
      },
    }),
  );

  return persistAuthPayload(payload);
}

export async function signUpWithEmail(input: SignUpInput): Promise<SignUpResult> {
  if (USE_MOCK_BACKEND) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedUsername = input.username.trim().toLowerCase();
    const mockCredentials = await loadMockCredentials();
    const existingCredential = mockCredentials.find((record) => record.email === normalizedEmail);

    if (existingCredential) {
      const existingUser = await getMockUserRegistryUser(existingCredential.userId);
      if (existingUser?.hasEmailVerification) {
        throw new Error("An account with this email already exists.");
      }

      if (existingUser) {
        const registryUsers = await Promise.all(
          mockCredentials.map((record) => getMockUserRegistryUser(record.userId)),
        );
        const usernameTaken = registryUsers.some(
          (user) =>
            user &&
            user.id !== existingUser.id &&
            user.publicProfile.usernameLower === normalizedUsername,
        );
        if (usernameTaken) {
          throw new Error("An account with this username already exists.");
        }

        const updatedUser: AppUser = {
          ...existingUser,
          publicProfile: {
            ...existingUser.publicProfile,
            displayName: input.displayName.trim() || existingUser.publicProfile.displayName,
            username: input.username.trim(),
            usernameLower: normalizedUsername,
          },
          privateProfile: {
            ...existingUser.privateProfile,
            email: normalizedEmail,
            phoneCountryCode: input.phoneCountryCode?.trim() ?? "",
            phoneNumber: input.phoneNumber?.trim() ?? "",
            birthDate: input.birthDate,
          },
          consentAccepted: input.consentAccepted,
          isUsernameSet: Boolean(input.username.trim()),
          hasEmailVerification: false,
          updatedAt: new Date().toISOString(),
        };

        const payload = buildMockPayload({ user: updatedUser });
        const state = await persistAuthPayload(payload);
        await upsertMockCredential({
          email: normalizedEmail,
          password: input.password,
          userId: state.user.id,
        });
        await saveCanonicalUser(updatedUser);

        return { state, resumedPendingVerification: true };
      }
    }

    const registryUsers = await Promise.all(
      mockCredentials.map((record) => getMockUserRegistryUser(record.userId)),
    );
    const usernameTaken = registryUsers.some(
      (user) => user?.publicProfile.usernameLower === normalizedUsername,
    );
    if (usernameTaken) {
      throw new Error("An account with this username already exists.");
    }

    const payload = buildMockPayload({
      user: buildMockUser({
        id: `user_${Date.now()}`,
        displayName: input.displayName.trim() || input.email.split("@")[0] || "Tourist User",
        username: input.username.trim().toLowerCase(),
        email: normalizedEmail,
        phoneCountryCode: input.phoneCountryCode?.trim() ?? "",
        phoneNumber: input.phoneNumber?.trim() ?? "",
        birthDate: input.birthDate,
        consentAccepted: input.consentAccepted,
      }),
    });
    const state = await persistAuthPayload(payload);
    await upsertMockCredential({
      email: normalizedEmail,
      password: input.password,
      userId: state.user.id,
    });
    console.log("[auth.service] signUpWithEmail mock success", {
      userId: state.user.id,
      hasPhoneVerification: state.user.hasPhoneVerification,
      hasEmailVerification: state.user.hasEmailVerification,
    });
    return { state };
  }

  const payload = parseAuthPayload(
    await apiRequest<AuthPayload>(API_ENDPOINTS.auth.signUp, {
      method: "POST",
      body: buildSignUpRequestBody(input),
    }),
  );

  const state = await persistAuthPayload(payload);
  console.log("[auth.service] signUpWithEmail api success", {
    userId: state.user.id,
    hasPhoneVerification: state.user.hasPhoneVerification,
    hasEmailVerification: state.user.hasEmailVerification,
    resumedPendingVerification: payload.signupMeta?.resumedPendingVerification ?? false,
  });
  return {
    state,
    resumedPendingVerification: payload.signupMeta?.resumedPendingVerification,
  };
}

export async function signOutSession(options?: { skipRemote?: boolean }): Promise<void> {
  const state = await loadAuthState();

  try {
    if (!options?.skipRemote && !USE_MOCK_BACKEND && state?.tokens.refreshToken) {
      await apiRequest<{ success: boolean }>(API_ENDPOINTS.auth.signOut, {
        method: "POST",
        body: { refreshToken: state.tokens.refreshToken },
      });
    }
  } catch (error) {
    console.warn("[auth.service] signOut API failed; clearing local session anyway.", error);
  } finally {
    await clearAuthState();
  }
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

  if (state.tokens.accessToken.startsWith("mock_access_")) {
    await clearAuthState();
    return null;
  }

  try {
    const payload = parseAuthPayload(
      await apiRequest<AuthPayload>(API_ENDPOINTS.auth.me, {
        method: "GET",
        token: state.tokens.accessToken,
      }),
    );

    await saveAuthState(payload);

    return {
      session: payload.session,
      user: payload.user,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isAuthFailure =
      message.includes("unauthorized") ||
      message.includes("invalid session") ||
      message.includes("user not found") ||
      message.includes("session not found");

    if (isAuthFailure) {
      await clearAuthState();
      return null;
    }

    throw error;
  }
}

export async function completePhoneVerification(userId: string, code: string): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== userId) {
      throw new Error("No auth state found for phone verification.");
    }
    const user: AppUser = {
      ...state.user,
      hasPhoneVerification: true,
      updatedAt: new Date().toISOString(),
    };
    await saveCanonicalUser(user);
    return user;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  const payload = parseAuthPayload(
    await apiRequest<AuthPayload>(API_ENDPOINTS.auth.verifyPhone, {
      method: "POST",
      token: state.tokens.accessToken,
      body: { code },
    }),
  );

  if (payload.user.id !== userId) {
    throw new Error("Verification response user mismatch.");
  }

  await saveAuthState(payload);
  return payload.user;
}

export async function completeEmailVerification(userId: string, code: string): Promise<AppUser> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state || state.user.id !== userId) {
      throw new Error("No auth state found for email verification.");
    }
    const user: AppUser = {
      ...state.user,
      hasEmailVerification: true,
      updatedAt: new Date().toISOString(),
    };
    await saveCanonicalUser(user);
    return user;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  const payload = parseAuthPayload(
    await apiRequest<AuthPayload>(API_ENDPOINTS.auth.verifyEmail, {
      method: "POST",
      token: state.tokens.accessToken,
      body: { code },
    }),
  );

  if (payload.user.id !== userId) {
    throw new Error("Verification response user mismatch.");
  }

  await saveAuthState(payload);
  return payload.user;
}

export async function resendPhoneCode(): Promise<void> {
  if (USE_MOCK_BACKEND) {
    console.log("[auth.service] resendPhoneCode mock — use 123456 for verification");
    return;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  await apiRequest<{ success: boolean }>(API_ENDPOINTS.auth.resendPhoneCode, {
    method: "POST",
    token: state.tokens.accessToken,
  });
}

export async function resendEmailCode(): Promise<void> {
  if (USE_MOCK_BACKEND) {
    console.log("[auth.service] resendEmailCode mock — use 123456 for verification");
    return;
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }

  await apiRequest<{ success: boolean }>(API_ENDPOINTS.auth.resendEmailCode, {
    method: "POST",
    token: state.tokens.accessToken,
  });
}
