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
