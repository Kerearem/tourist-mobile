export function resolveSocketOrigin(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  }
}
