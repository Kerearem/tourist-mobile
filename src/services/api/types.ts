export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  token?: string;
};

export type ApiError = {
  status: number;
  message: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type ApiResponseEnvelope<T> = {
  data: T;
};
