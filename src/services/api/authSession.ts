import type { AuthSession } from "../../models/auth";
import type { AppUser } from "../../models/user";
import { getSecureItem, removeSecureItem, setSecureItem } from "../storage/secureStorage";
import type { SessionTokens } from "./types";

type PersistedAuthState = {
  session: AuthSession;
  user: AppUser;
  tokens: SessionTokens;
};

const AUTH_STATE_KEY = "tourist.auth.state";
const MOCK_USER_REGISTRY_KEY = "tourist.mock.user.registry";
type MockUserRegistry = Record<string, AppUser>;

const normalizeUser = (raw: unknown): AppUser | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const legacy = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  if (legacy.publicProfile && legacy.privateProfile) {
    const user: AppUser = {
      id: String(legacy.id ?? ""),
      roles: Array.isArray(legacy.roles) ? (legacy.roles as AppUser["roles"]) : ["user"],
      organizerStatus: (legacy.organizerStatus as AppUser["organizerStatus"]) ?? "not_applied",
      hasPhoneVerification: Boolean(legacy.hasPhoneVerification),
      hasEmailVerification: Boolean(legacy.hasEmailVerification),
      consentAccepted: Boolean(legacy.consentAccepted),
      isUsernameSet: Boolean(legacy.isUsernameSet),
      createdAt: typeof legacy.createdAt === "string" ? legacy.createdAt : now,
      updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : now,
      publicProfile: legacy.publicProfile as AppUser["publicProfile"],
      privateProfile: legacy.privateProfile as AppUser["privateProfile"],
    };

    return user;
  }

  const displayName = String(legacy.displayName ?? "Tourist User");
  const email = typeof legacy.email === "string" ? legacy.email : "";
  const usernameFromEmail = email.includes("@") ? email.split("@")[0] : "touristuser";
  const username = usernameFromEmail.toLowerCase();

  const user: AppUser = {
    id: String(legacy.id ?? ""),
    roles: ["user"],
    organizerStatus: (legacy.organizerStatus as AppUser["organizerStatus"]) ?? "not_applied",
    hasPhoneVerification: Boolean(legacy.hasPhoneVerification),
    hasEmailVerification: Boolean(legacy.hasEmailVerification),
    consentAccepted: false,
    isUsernameSet: true,
    createdAt: now,
    updatedAt: now,
    publicProfile: {
      displayName,
      username,
      usernameLower: username,
      homeCommunity: String(legacy.community ?? ""),
      currentCity: String(legacy.currentCity ?? ""),
      interests: [],
    },
    privateProfile: {
      email,
      phoneCountryCode: "+90",
      phoneNumber: "",
      birthDate: "",
      nationalityCountryCode: String(legacy.homeCountryCode ?? ""),
      destinationCountryCode: String(legacy.currentCountryCode ?? ""),
      destinationCity: String(legacy.currentCity ?? ""),
      relocationReason: null,
      spokenLanguages: [],
    },
  };

  return user;
};

const loadMockUserRegistry = async (): Promise<MockUserRegistry> => {
  const raw = await getSecureItem(MOCK_USER_REGISTRY_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed);
    const normalizedEntries = entries.flatMap(([userId, maybeUser]) => {
      const user = normalizeUser(maybeUser);
      if (!user || !userId) {
        return [];
      }
      return [[userId, user] as const];
    });
    return Object.fromEntries(normalizedEntries);
  } catch {
    await removeSecureItem(MOCK_USER_REGISTRY_KEY);
    return {};
  }
};

const saveMockUserRegistry = async (registry: MockUserRegistry): Promise<void> => {
  await setSecureItem(MOCK_USER_REGISTRY_KEY, JSON.stringify(registry));
};

export async function upsertMockUserRegistryUser(user: AppUser): Promise<void> {
  const registry = await loadMockUserRegistry();
  registry[user.id] = user;
  await saveMockUserRegistry(registry);
}

export async function getMockUserRegistryUser(userId: string): Promise<AppUser | null> {
  if (!userId) {
    return null;
  }
  const registry = await loadMockUserRegistry();
  return registry[userId] ?? null;
}

export async function getMockUserRegistryUsers(): Promise<AppUser[]> {
  const registry = await loadMockUserRegistry();
  return Object.values(registry);
}

export async function saveAuthState(state: PersistedAuthState): Promise<void> {
  await setSecureItem(AUTH_STATE_KEY, JSON.stringify(state));
  await upsertMockUserRegistryUser(state.user);
}

export async function loadAuthState(): Promise<PersistedAuthState | null> {
  const raw = await getSecureItem(AUTH_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAuthState;
    const normalizedUser = normalizeUser(parsed.user);
    if (!normalizedUser) {
      await removeSecureItem(AUTH_STATE_KEY);
      return null;
    }
    return {
      ...parsed,
      user: normalizedUser,
    };
  } catch {
    await removeSecureItem(AUTH_STATE_KEY);
    return null;
  }
}

export async function clearAuthState(): Promise<void> {
  await removeSecureItem(AUTH_STATE_KEY);
}

export async function updateAuthTokens(tokens: SessionTokens): Promise<void> {
  const state = await loadAuthState();
  if (!state) {
    return;
  }

  await saveAuthState({
    ...state,
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? state.tokens.refreshToken,
    },
  });
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onAuthSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifyAuthSessionExpired(): void {
  sessionExpiredListeners.forEach((listener) => {
    listener();
  });
}

export async function saveCanonicalUser(user: AppUser): Promise<void> {
  const state = await loadAuthState();
  if (!state) {
    return;
  }

  await saveAuthState({
    ...state,
    user,
  });
}
