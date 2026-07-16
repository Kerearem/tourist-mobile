import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  NET_RECONNECT_DEBOUNCE_MS,
  clearNetInfoSubscription,
  createReconnectScheduler,
  isNetOnline,
  loadNetInfoSafely,
  resetNetInfoLoadCacheForTests,
  shouldForceReconnectOnNetChange,
  type NetInfoModule,
  type NetSnapshot,
} from "../src/features/messages/realtime/messagesRealtimeNetRecovery";
import { resolveSocketConnectNotification } from "../src/features/messages/realtime/messagesRealtimeConnectLifecycle";

const clientSource = readFileSync(
  join(process.cwd(), "src/features/messages/realtime/messagesRealtimeClient.ts"),
  "utf8",
);
const appJson = JSON.parse(readFileSync(join(process.cwd(), "app.json"), "utf8")) as {
  expo: { runtimeVersion?: unknown; updates?: unknown };
};

const online = (type: string | null = "wifi"): NetSnapshot => ({
  isConnected: true,
  isInternetReachable: true,
  type,
});
const offline = (): NetSnapshot => ({
  isConnected: false,
  isInternetReachable: false,
  type: "none",
});

describe("net online detection", () => {
  it("treats connected networks as online, unknown reachability included", () => {
    assert.equal(isNetOnline(online()), true);
    assert.equal(isNetOnline({ isConnected: true, isInternetReachable: null, type: "cellular" }), true);
    assert.equal(isNetOnline(offline()), false);
    assert.equal(isNetOnline({ isConnected: true, isInternetReachable: false, type: "wifi" }), false);
    assert.equal(isNetOnline({ isConnected: null, isInternetReachable: null, type: null }), false);
  });
});

describe("offline→online force reconnect decision", () => {
  it("forces a reconnect when coming back online", () => {
    assert.equal(shouldForceReconnectOnNetChange(offline(), online()), true);
  });

  it("treats a network type change as a recovery trigger", () => {
    assert.equal(shouldForceReconnectOnNetChange(online("wifi"), online("cellular")), true);
  });

  it("does not reconnect on the initial snapshot, while offline, or on no-op events", () => {
    assert.equal(shouldForceReconnectOnNetChange(null, online()), false);
    assert.equal(shouldForceReconnectOnNetChange(online(), offline()), false);
    assert.equal(shouldForceReconnectOnNetChange(offline(), offline()), false);
    assert.equal(shouldForceReconnectOnNetChange(online("wifi"), online("wifi")), false);
  });
});

describe("reconnect debounce scheduler", () => {
  type FakeTimer = { fn: () => void; ms: number; cleared: boolean };

  const createFakeTimers = () => {
    const timers: FakeTimer[] = [];
    const setTimer = (fn: () => void, ms: number) => {
      const handle: FakeTimer = { fn, ms, cleared: false };
      timers.push(handle);
      return handle as unknown as ReturnType<typeof setTimeout>;
    };
    const clearTimer = (handle: ReturnType<typeof setTimeout>) => {
      (handle as unknown as FakeTimer).cleared = true;
    };
    return { timers, setTimer, clearTimer };
  };

  it("collapses bursts of schedule calls into a single reconnect", () => {
    const { timers, setTimer, clearTimer } = createFakeTimers();
    let runs = 0;
    const scheduler = createReconnectScheduler(() => {
      runs += 1;
    }, NET_RECONNECT_DEBOUNCE_MS, setTimer, clearTimer);

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    const active = timers.filter((timer) => !timer.cleared);
    assert.equal(active.length, 1);
    assert.equal(active[0]?.ms, NET_RECONNECT_DEBOUNCE_MS);

    active[0]?.fn();
    assert.equal(runs, 1);
  });

  it("cancel prevents a pending reconnect", () => {
    const { timers, setTimer, clearTimer } = createFakeTimers();
    let runs = 0;
    const scheduler = createReconnectScheduler(() => {
      runs += 1;
    }, NET_RECONNECT_DEBOUNCE_MS, setTimer, clearTimer);

    scheduler.schedule();
    scheduler.cancel();

    assert.equal(timers.filter((timer) => !timer.cleared).length, 0);
    assert.equal(runs, 0);
  });

  it("uses a 1-2 second debounce window", () => {
    assert.ok(NET_RECONNECT_DEBOUNCE_MS >= 1000 && NET_RECONNECT_DEBOUNCE_MS <= 2000);
  });

  it("clears NetInfo subscriptions safely", () => {
    let removed = false;
    assert.equal(
      clearNetInfoSubscription(() => {
        removed = true;
      }),
      null,
    );
    assert.equal(removed, true);
    assert.equal(clearNetInfoSubscription(null), null);
  });
});

describe("realtime client net recovery wiring", () => {
  it("does not eagerly import NetInfo at module top-level", () => {
    assert.equal(
      /^\s*import\s+NetInfo\s+from\s+["']@react-native-community\/netinfo["']/m.test(clientSource),
      false,
    );
    assert.equal(clientSource.includes('import NetInfo from "@react-native-community/netinfo"'), false);
  });

  it("loads NetInfo lazily via the safe helper and keeps recovery decisions unchanged", () => {
    assert.match(clientSource, /loadNetInfoSafely\(\)/);
    assert.match(clientSource, /NetInfo\.addEventListener/);
    assert.match(clientSource, /shouldForceReconnectOnNetChange\(previous, snapshot\)/);
    assert.match(clientSource, /this\.reconnectScheduler\.schedule\(\)/);
  });

  it("keeps the NetInfo listener a no-op in mock mode", () => {
    assert.match(
      clientSource,
      /if \(USE_MOCK_BACKEND \|\| this\.netInfoUnsubscribe \|\| this\.netInfoAttachInFlight\) \{\s*return;\s*\}/s,
    );
    assert.match(clientSource, /forceReconnect\(\): void \{\s*if \(USE_MOCK_BACKEND\) \{\s*return;\s*\}/s);
  });

  it("bypasses the zombie-socket connected guard on forced reconnects", () => {
    assert.match(clientSource, /if \(!options\?\.force && this\.socket\?\.connected && this\.connectionKey === nextConnectionKey\)/);
    assert.match(clientSource, /connectForCurrentSession\(userId, \{ force: true \}\)/);
  });

  it("routes the AppState active path through the forced reconnect scheduler", () => {
    assert.match(
      clientSource,
      /nextState !== "active" \|\| USE_MOCK_BACKEND[\s\S]*?this\.reconnectScheduler\.schedule\(\)/,
    );
  });

  it("preserves the reconnect notification across same-user forced reconnects", () => {
    assert.match(clientSource, /const isSameSession = this\.connectionKey\?\.split\(":"\)\[0\] === userId;/);
    assert.match(clientSource, /if \(!isSameSession\) \{\s*this\.hasConnectedOnce = false;\s*\}/s);
    assert.deepEqual(resolveSocketConnectNotification(true), {
      notifyReconnect: true,
      nextHasConnectedOnce: true,
    });
  });

  it("cleans up the NetInfo subscription and pending reconnects on disconnect", () => {
    assert.match(clientSource, /this\.reconnectScheduler\.cancel\(\)/);
    assert.match(clientSource, /clearNetInfoSubscription\(this\.netInfoUnsubscribe\)/);
    assert.match(clientSource, /this\.lastNetSnapshot = null;/);
  });
});

describe("safe NetInfo load when native module is missing", () => {
  const createFakeNetInfo = (): NetInfoModule => ({
    addEventListener: () => () => undefined,
  });

  it("returns null without throwing when the import fails, and warns once", async () => {
    resetNetInfoLoadCacheForTests();
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    try {
      const first = await loadNetInfoSafely(async () => {
        throw new Error("NativeModule.RNCNetInfo is null");
      });
      const second = await loadNetInfoSafely(async () => {
        throw new Error("should not be called again");
      });

      assert.equal(first, null);
      assert.equal(second, null);
      assert.equal(warnings.length, 1);
      const firstWarning = warnings[0] as unknown[];
      assert.match(String(firstWarning[0]), /NetInfo native module unavailable/);
    } finally {
      console.warn = originalWarn;
      resetNetInfoLoadCacheForTests();
    }
  });

  it("caches a successful load and never re-imports", async () => {
    resetNetInfoLoadCacheForTests();
    let importCount = 0;
    const module = createFakeNetInfo();

    const first = await loadNetInfoSafely(async () => {
      importCount += 1;
      return { default: module };
    });
    const second = await loadNetInfoSafely(async () => {
      importCount += 1;
      throw new Error("should not re-import");
    });

    assert.equal(first, module);
    assert.equal(second, module);
    assert.equal(importCount, 1);
    resetNetInfoLoadCacheForTests();
  });

  it("treats a failed load as a permanent no-op so AppState/forceReconnect paths stay independent", async () => {
    resetNetInfoLoadCacheForTests();
    const originalWarn = console.warn;
    console.warn = () => undefined;

    try {
      assert.equal(
        await loadNetInfoSafely(async () => {
          throw new Error("missing native module");
        }),
        null,
      );

      // Reconnect decision helpers and AppState/forceReconnect wiring remain intact
      // even when NetInfo never attaches — recovery still works via AppState.
      assert.equal(shouldForceReconnectOnNetChange(offline(), online()), true);
      assert.match(clientSource, /forceReconnect\(\): void/);
      assert.match(
        clientSource,
        /nextState !== "active" \|\| USE_MOCK_BACKEND[\s\S]*?this\.reconnectScheduler\.schedule\(\)/,
      );
      assert.match(clientSource, /await loadNetInfoSafely\(\)/);
      assert.match(clientSource, /if \(!NetInfo \|\| this\.netInfoUnsubscribe \|\| USE_MOCK_BACKEND\)/);
    } finally {
      console.warn = originalWarn;
      resetNetInfoLoadCacheForTests();
    }
  });
});

describe("runtimeVersion update safety", () => {
  it("pins Expo Updates to a fingerprint runtime so native-incompatible OTA JS is blocked", () => {
    assert.deepEqual(appJson.expo.runtimeVersion, { policy: "fingerprint" });
  });
});
