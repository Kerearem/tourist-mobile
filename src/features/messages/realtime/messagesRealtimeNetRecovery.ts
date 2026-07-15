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
