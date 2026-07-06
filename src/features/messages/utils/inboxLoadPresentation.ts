export type InboxLoadMode = "initial" | "refresh" | "silent";

export function resolveInboxFocusLoadMode(hasLoadedOnce: boolean): InboxLoadMode {
  return hasLoadedOnce ? "silent" : "initial";
}

export function shouldSetInboxLoadingState(mode: InboxLoadMode, hasCachedData: boolean): boolean {
  return mode === "initial" && !hasCachedData;
}

export function shouldSetInboxRefreshingState(mode: InboxLoadMode): boolean {
  return mode === "refresh";
}

export function shouldShowInboxFullScreenLoader(isLoading: boolean, hasCachedData: boolean): boolean {
  return isLoading && !hasCachedData;
}

export function shouldShowInboxFullScreenError(error: string | null, hasCachedData: boolean): boolean {
  return Boolean(error) && !hasCachedData;
}

export function shouldClearInboxOnLoadError(hasLoadedOnce: boolean): boolean {
  return !hasLoadedOnce;
}
