import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { resolveSocketOrigin } from "../src/features/messages/realtime/resolveSocketOrigin";
import {
  clearAppStateSubscription,
  resolveSocketConnectNotification,
} from "../src/features/messages/realtime/messagesRealtimeConnectLifecycle";
import {
  isConversationSnapshotNewer,
  sortConversationThreads,
  upsertConversationThread,
} from "../src/features/messages/utils/inboxRealtime";
import {
  applyRequestConversationRealtimeUpdate,
  isPendingMessageRequest,
  removeRequestThread,
  upsertRequestThread,
} from "../src/features/messages/utils/requestInboxRealtime";
import { appendMessageDeduped } from "../src/features/messages/utils/threadRealtime";
import {
  resolveIncomingMessageScrollPlan,
  resolveOwnMessageSentScrollPlan,
} from "../src/features/messages/utils/messageThreadAutoScroll";
import type { ConversationMessage, ConversationThread } from "../src/features/messages/types";

const thread = (overrides: Partial<ConversationThread>): ConversationThread => ({
  id: "thread-1",
  type: "direct",
  participants: [{ id: "user-1", displayName: "Ada" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const message = (overrides: Partial<ConversationMessage>): ConversationMessage => ({
  id: "msg-1",
  conversationId: "thread-1",
  sender: { id: "user-2", displayName: "Bob" },
  type: "text",
  text: "Merhaba",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("resolveSocketOrigin", () => {
  it("strips /api/v1 from REST base URLs", () => {
    assert.equal(resolveSocketOrigin("https://example.com/api/v1"), "https://example.com");
    assert.equal(resolveSocketOrigin("http://localhost:4000/api/v1"), "http://localhost:4000");
  });
});

describe("inbox realtime upsert", () => {
  it("upserts and sorts conversations by last message time", () => {
    const initial = [
      thread({ id: "a", lastMessageAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T10:00:00.000Z" }),
      thread({ id: "b", lastMessageAt: "2026-01-02T10:00:00.000Z", updatedAt: "2026-01-02T10:00:00.000Z" }),
    ];

    const next = upsertConversationThread(initial, thread({
      id: "a",
      lastMessageAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
      lastMessagePreview: "Yeni",
      unreadCount: 1,
    }));

    assert.equal(next[0]?.id, "a");
    assert.equal(next[1]?.id, "b");
  });

  it("does not let older snapshots overwrite newer inbox rows", () => {
    const existing = thread({
      lastMessageAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-01-03T10:00:00.000Z",
      unreadCount: 0,
    });
    const stale = thread({
      lastMessageAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
      unreadCount: 4,
    });

    assert.equal(isConversationSnapshotNewer(stale, existing), false);
    assert.deepEqual(upsertConversationThread([existing], stale), [existing]);
    assert.deepEqual(sortConversationThreads([existing, stale])[0]?.id, existing.id);
  });
});

describe("thread realtime dedupe", () => {
  it("dedupes by message id and keeps createdAt order", () => {
    const current = [message({ id: "msg-1", createdAt: "2026-01-01T00:00:00.000Z" })];
    const appended = appendMessageDeduped(current, message({ id: "msg-2", createdAt: "2026-01-02T00:00:00.000Z" }));
    const deduped = appendMessageDeduped(appended, message({ id: "msg-2", createdAt: "2026-01-02T00:00:00.000Z" }));

    assert.deepEqual(deduped.map((item) => item.id), ["msg-1", "msg-2"]);
  });
});

describe("incoming message auto-scroll", () => {
  it("scrolls only when the viewer is near the bottom", () => {
    assert.deepEqual(resolveIncomingMessageScrollPlan(true), { shouldScroll: true });
    assert.deepEqual(resolveIncomingMessageScrollPlan(false), { shouldScroll: false });
  });

  it("keeps own-message scroll behavior unchanged", () => {
    assert.deepEqual(resolveOwnMessageSentScrollPlan(0), {
      pendingReason: "own_message_sent",
      shouldScrollImmediately: false,
    });
    assert.deepEqual(resolveOwnMessageSentScrollPlan(2), {
      pendingReason: "own_message_sent",
      shouldScrollImmediately: true,
    });
  });
});

describe("request inbox realtime", () => {
  it("detects pending request conversations from metadata", () => {
    assert.equal(
      isPendingMessageRequest(thread({ metadata: { isRequestPending: "true" } })),
      true,
    );
    assert.equal(isPendingMessageRequest(thread({})), false);
  });

  it("upserts pending requests without duplicate rows", () => {
    const initial = [
      thread({
        id: "req-1",
        metadata: { isRequestPending: "true" },
        lastMessageAt: "2026-01-01T10:00:00.000Z",
      }),
    ];
    const updated = thread({
      id: "req-1",
      metadata: { isRequestPending: "true" },
      lastMessageAt: "2026-01-02T10:00:00.000Z",
      lastMessagePreview: "Merhaba",
    });

    const next = upsertRequestThread(initial, updated);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.lastMessagePreview, "Merhaba");
  });

  it("removes accepted conversations from the request list", () => {
    const requests = [
      thread({ id: "req-1", metadata: { isRequestPending: "true" } }),
      thread({ id: "req-2", metadata: { isRequestPending: "true" } }),
    ];
    const accepted = thread({ id: "req-1", lastMessagePreview: "Selam" });

    const next = applyRequestConversationRealtimeUpdate(requests, accepted);
    assert.deepEqual(next.map((item) => item.id), ["req-2"]);
    assert.deepEqual(removeRequestThread(requests, "req-2").map((item) => item.id), ["req-1"]);
  });
});

describe("messages request screens realtime wiring", () => {
  it("refreshes request count on pending conversation updates in inbox", () => {
    const inboxSource = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessagesInboxScreen.tsx"),
      "utf8",
    );

    assert.match(inboxSource, /isPendingMessageRequest\(conversation\)/);
    assert.match(inboxSource, /refreshRequestCount/);
    assert.doesNotMatch(inboxSource, /isRequestPending === "true"\) \{\s*return;\s*\}/s);
  });

  it("subscribes MessageRequestsScreen to conversation realtime updates", () => {
    const requestsSource = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessageRequestsScreen.tsx"),
      "utf8",
    );

    assert.match(requestsSource, /useMessagesRealtime/);
    assert.match(requestsSource, /applyRequestConversationRealtimeUpdate/);
  });
});

describe("messages realtime connect lifecycle", () => {
  it("does not notify reconnect handlers on the first connect", () => {
    assert.deepEqual(resolveSocketConnectNotification(false), {
      notifyReconnect: false,
      nextHasConnectedOnce: true,
    });
  });

  it("notifies reconnect handlers after the socket has connected once", () => {
    assert.deepEqual(resolveSocketConnectNotification(true), {
      notifyReconnect: true,
      nextHasConnectedOnce: true,
    });
  });

  it("removes AppState subscription during disconnect cleanup", () => {
    let removed = false;
    const subscription = {
      remove() {
        removed = true;
      },
    };

    assert.equal(clearAppStateSubscription(subscription), null);
    assert.equal(removed, true);
    assert.equal(clearAppStateSubscription(null), null);
  });
});

describe("messages realtime client source contract", () => {
  const clientSource = readFileSync(
    join(process.cwd(), "src/features/messages/realtime/messagesRealtimeClient.ts"),
    "utf8",
  );

  it("clears AppState subscription and resets connect lifecycle on disconnect", () => {
    assert.match(clientSource, /clearAppStateSubscription\(this\.appStateSubscription\)/);
    assert.match(clientSource, /this\.hasConnectedOnce = false/);
    assert.match(clientSource, /resolveSocketConnectNotification/);
  });

  it("skips reconnect handlers on the first connect event", () => {
    assert.match(clientSource, /if \(!notifyReconnect\) \{\s*return;\s*\}/s);
  });
});
