/**
 * Pure helpers for recovering the realtime socket after foreground network loss.
 *
 * With websocket-only transports a dropped network kills the TCP stream silently:
 * the client keeps `socket.connected === true` (zombie) and never re-fires
 * "connect". NetInfo transitions are the only reliable signal, so offline→online
 * and network-type changes force a teardown + reconnect.
 */

export type NetSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
};

/** Unknown reachability (null) counts as online so captive-portal checks don't block recovery. */
export function isNetOnline(snapshot: NetSnapshot): boolean {
  return Boolean(snapshot.isConnected) && snapshot.isInternetReachable !== false;
}

/**
 * Force a reconnect when we land online after being offline, or when the
 * network type changes while staying online (wifi→cellular can also kill the
 * socket). The first snapshot only seeds state and never reconnects.
 */
export function shouldForceReconnectOnNetChange(
  previous: NetSnapshot | null,
  next: NetSnapshot,
): boolean {
  if (!isNetOnline(next)) {
    return false;
  }
  if (previous === null) {
    return false;
  }
  if (!isNetOnline(previous)) {
    return true;
  }
  return previous.type !== next.type;
}

export const NET_RECONNECT_DEBOUNCE_MS = 1500;

type TimerHandle = ReturnType<typeof setTimeout>;

export type ReconnectScheduler = {
  schedule: () => void;
  cancel: () => void;
};

/**
 * Trailing debounce: bursts of NetInfo/AppState events collapse into a single
 * reconnect. Timer functions are injectable for tests.
 */
export function createReconnectScheduler(
  run: () => void,
  debounceMs: number = NET_RECONNECT_DEBOUNCE_MS,
  setTimer: (fn: () => void, ms: number) => TimerHandle = setTimeout,
  clearTimer: (handle: TimerHandle) => void = clearTimeout,
): ReconnectScheduler {
  let timer: TimerHandle | null = null;

  return {
    schedule() {
      if (timer !== null) {
        clearTimer(timer);
      }
      timer = setTimer(() => {
        timer = null;
        run();
      }, debounceMs);
    },
    cancel() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
    },
  };
}

export function clearNetInfoSubscription(unsubscribe: (() => void) | null): null {
  unsubscribe?.();
  return null;
}

/** Minimal NetInfo surface used by the realtime client. */
export type NetInfoModule = {
  addEventListener: (
    listener: (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
      type: string | null;
    }) => void,
  ) => () => void;
};

type NetInfoLoadCache =
  | { status: "available"; module: NetInfoModule }
  | { status: "unavailable" };

let netInfoLoadCache: NetInfoLoadCache | null = null;
let netInfoUnavailableWarned = false;

type NetInfoImporter = () => Promise<{ default: NetInfoModule } | NetInfoModule>;

/**
 * Lazily load NetInfo so an old native binary (module missing) never crashes
 * app startup via an eager top-level import. Failed loads are cached — one
 * attempt only — and network recovery stays silently disabled while AppState
 * recovery continues to work.
 */
export async function loadNetInfoSafely(
  importer: NetInfoImporter = () => import("@react-native-community/netinfo"),
): Promise<NetInfoModule | null> {
  if (netInfoLoadCache?.status === "available") {
    return netInfoLoadCache.module;
  }
  if (netInfoLoadCache?.status === "unavailable") {
    return null;
  }

  try {
    const loaded = await importer();
    const module =
      loaded && typeof loaded === "object" && "default" in loaded && loaded.default
        ? loaded.default
        : (loaded as NetInfoModule);

    if (typeof module?.addEventListener !== "function") {
      throw new Error("NetInfo module is missing addEventListener");
    }

    netInfoLoadCache = { status: "available", module };
    return module;
  } catch (error) {
    netInfoLoadCache = { status: "unavailable" };
    if (!netInfoUnavailableWarned) {
      netInfoUnavailableWarned = true;
      console.warn(
        "[messagesRealtime] NetInfo native module unavailable; network recovery disabled.",
        error,
      );
    }
    return null;
  }
}

/** Test-only: clear the one-shot load cache between cases. */
export function resetNetInfoLoadCacheForTests(): void {
  netInfoLoadCache = null;
  netInfoUnavailableWarned = false;
}
