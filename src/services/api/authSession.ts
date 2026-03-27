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

export async function saveAuthState(state: PersistedAuthState): Promise<void> {
  await setSecureItem(AUTH_STATE_KEY, JSON.stringify(state));
}

export async function loadAuthState(): Promise<PersistedAuthState | null> {
  const raw = await getSecureItem(AUTH_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    await removeSecureItem(AUTH_STATE_KEY);
    return null;
  }
}

export async function clearAuthState(): Promise<void> {
  await removeSecureItem(AUTH_STATE_KEY);
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
