import { API_BASE_URL, API_TIMEOUT_MS, USE_MOCK_BACKEND } from "../../constants/env";
import { API_ENDPOINTS } from "./endpoints";
import { clearAuthState, loadAuthState, notifyAuthSessionExpired, updateAuthTokens } from "./authSession";
import type { ApiRequestOptions, ApiResponseEnvelope } from "./types";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

type RefreshTokensResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const AUTH_PUBLIC_PATHS = new Set([
  API_ENDPOINTS.auth.signIn,
  API_ENDPOINTS.auth.signUp,
  API_ENDPOINTS.auth.signOut,
  API_ENDPOINTS.auth.refresh,
  API_ENDPOINTS.auth.restoreAccount,
  API_ENDPOINTS.auth.restoreAccountRequest,
  API_ENDPOINTS.auth.restoreAccountVerify,
]);

let refreshInFlight: Promise<string | null> | null = null;

const parseErrorMessage = (payload: unknown, fallback: string) => {
  const errorPayload = payload as { message?: string | string[]; code?: string };
  if (Array.isArray(errorPayload.message)) {
    return errorPayload.message.join(", ");
  }
  if (typeof errorPayload.message === "string" && errorPayload.message.trim()) {
    return errorPayload.message;
  }
  return fallback;
};

const parseErrorCode = (payload: unknown) => {
  const errorPayload = payload as { code?: string };
  return typeof errorPayload.code === "string" ? errorPayload.code : undefined;
};

const performRefresh = async (): Promise<string | null> => {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    return state?.tokens.accessToken ?? null;
  }

  const state = await loadAuthState();
  const refreshToken = state?.tokens.refreshToken?.trim();
  if (!state || !refreshToken) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(API_ENDPOINTS.auth.refresh), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as ApiResponseEnvelope<RefreshTokensResponse> | { message?: string };

    if (!response.ok) {
      return null;
    }

    const tokens = (payload as ApiResponseEnvelope<RefreshTokensResponse>).data?.tokens;
    if (!tokens?.accessToken || !tokens.refreshToken) {
      return null;
    }

    await updateAuthTokens(tokens);
    return tokens.accessToken;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

const executeRequest = async <T>(
  path: string,
  options: ApiRequestOptions,
  token?: string,
): Promise<{ response: Response; payload: ApiResponseEnvelope<T> | { message?: string | string[] } }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = (await response.json()) as ApiResponseEnvelope<T> | { message?: string | string[] };
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const initialToken = options.token;
  const canRefresh =
    !options.skipAuthRetry &&
    Boolean(initialToken) &&
    !AUTH_PUBLIC_PATHS.has(path);

  const { response, payload } = await executeRequest<T>(path, options, initialToken);

  if (response.status === 401 && canRefresh) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      const retry = await executeRequest<T>(path, options, nextAccessToken);
      if (retry.response.ok) {
        return (retry.payload as ApiResponseEnvelope<T>).data;
      }

      if (retry.response.status === 401) {
        await clearAuthState();
        notifyAuthSessionExpired();
        throw new ApiRequestError(parseErrorMessage(retry.payload, "Unauthorized"), 401, parseErrorCode(retry.payload));
      }

      throw new ApiRequestError(
        parseErrorMessage(retry.payload, "API request failed."),
        retry.response.status,
        parseErrorCode(retry.payload),
      );
    }

    await clearAuthState();
    notifyAuthSessionExpired();
    throw new ApiRequestError(parseErrorMessage(payload, "Unauthorized"), 401, parseErrorCode(payload));
  }

  if (!response.ok) {
    throw new ApiRequestError(
      parseErrorMessage(payload, "API request failed."),
      response.status,
      parseErrorCode(payload),
    );
  }

  return (payload as ApiResponseEnvelope<T>).data;
}
