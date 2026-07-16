export type ThreadLoadMode = "initial" | "silent";

export function resolveThreadLoadMode(hasCachedThread: boolean): ThreadLoadMode {
  return hasCachedThread ? "silent" : "initial";
}

export function shouldSetThreadLoadingState(
  mode: ThreadLoadMode,
  hasCachedThread: boolean,
): boolean {
  return mode === "initial" && !hasCachedThread;
}

export function shouldShowThreadFullScreenLoader(
  isLoading: boolean,
  hasCachedThread: boolean,
): boolean {
  return isLoading && !hasCachedThread;
}

export function shouldShowThreadFullScreenError(
  error: string | null,
  hasCachedThread: boolean,
): boolean {
  return Boolean(error) && !hasCachedThread;
}

export function shouldClearThreadOnLoadError(hasCachedThread: boolean): boolean {
  return !hasCachedThread;
}
