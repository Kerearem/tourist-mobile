import { API_BASE_URL, API_TIMEOUT_MS } from "../../constants/env";
import type { ApiError, ApiRequestOptions, ApiResponseEnvelope } from "./types";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = (await response.json()) as ApiResponseEnvelope<T> | ApiError;

    if (!response.ok) {
      const errorPayload = payload as ApiError;
      throw new Error(errorPayload.message || "API request failed.");
    }

    return (payload as ApiResponseEnvelope<T>).data;
  } finally {
    clearTimeout(timeout);
  }
}
