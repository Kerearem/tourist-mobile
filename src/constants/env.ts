const boolFromEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.tourist.local";
export const USE_MOCK_BACKEND = boolFromEnv(process.env.EXPO_PUBLIC_USE_MOCK_BACKEND, true);
export const API_TIMEOUT_MS = 10000;
