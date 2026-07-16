import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  MESSAGES_SESSION_CACHE_MAX_THREADS,
  appendCachedThreadMessage,
  clearMessagesSessionCache,
  getCachedInbox,
  getCachedThread,
  getCachedThreadByEventId,
  getCachedThreadIdsForTests,
  patchCachedThreadMessageUpdated,
  patchCachedThreadReceipts,
  setCachedInbox,
  setCachedThread,
} from "../src/features/messages/cache/messagesSessionCache";
import {
  resolveThreadLoadMode,
  shouldClearThreadOnLoadError,
  shouldSetThreadLoadingState,
  shouldShowThreadFullScreenError,
  shouldShowThreadFullScreenLoader,
} from "../src/features/messages/utils/threadLoadPresentation";
import type { ConversationMessage, ConversationThread } from "../src/features/messages/types";

afterEach(() => {
  clearMessagesSessionCache();
});

const thread = (id: string): ConversationThread => ({
  id,
  type: "direct",
  participants: [{ id: "u1", displayName: "A" }],
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
});

const message = (
  id: string,
  conversationId: string,
  overrides: Partial<ConversationMessage> = {},
): ConversationMessage => ({
  id,
  conversationId,
  sender: { id: "u1", displayName: "A" },
  type: "text",
  text: `msg-${id}`,
  createdAt: "2026-07-01T00:00:00.000Z",
  status: "sent",
  ...overrides,
});

describe("thread load presentation (stale-while-revalidate)", () => {
  it("uses silent mode when a warm cache exists", () => {
    assert.equal(resolveThreadLoadMode(false), "initial");
    assert.equal(resolveThreadLoadMode(true), "silent");
  });

  it("shows full-screen loader only for cold initial loads", () => {
    assert.equal(shouldSetThreadLoadingState("initial", false), true);
    assert.equal(shouldSetThreadLoadingState("initial", true), false);
    assert.equal(shouldSetThreadLoadingState("silent", false), false);
    assert.equal(shouldShowThreadFullScreenLoader(true, true), false);
    assert.equal(shouldShowThreadFullScreenLoader(true, false), true);
  });

  it("keeps cached thread visible when a background refresh fails", () => {
    assert.equal(shouldShowThreadFullScreenError("fail", true), false);
    assert.equal(shouldClearThreadOnLoadError(true), false);
    assert.equal(shouldShowThreadFullScreenError("fail", false), true);
  });
});

describe("messages session cache", () => {
  it("reads back written thread and inbox snapshots", () => {
    const conversation = thread("c1");
    const messages = [message("m1", "c1")];
    setCachedThread("c1", { conversation, messages, pinnedMessage: null });
    setCachedInbox([conversation]);

    assert.deepEqual(getCachedThread("c1")?.messages.map((item) => item.id), ["m1"]);
    assert.equal(getCachedThread("c1")?.conversation?.id, "c1");
    assert.deepEqual(getCachedInbox()?.map((item) => item.id), ["c1"]);
  });

  it("evicts the least-recently-used thread beyond the memory cap", () => {
    for (let index = 0; index < MESSAGES_SESSION_CACHE_MAX_THREADS + 2; index += 1) {
      const id = `c${index}`;
      setCachedThread(id, {
        conversation: thread(id),
        messages: [message(`m${index}`, id)],
      });
    }

    const ids = getCachedThreadIdsForTests();
    assert.equal(ids.length, MESSAGES_SESSION_CACHE_MAX_THREADS);
    assert.equal(ids.includes("c0"), false);
    assert.equal(ids.includes("c1"), false);
    assert.equal(Boolean(getCachedThread(`c${MESSAGES_SESSION_CACHE_MAX_THREADS + 1}`)), true);
  });

  it("LRU-touches a thread on read so recently opened chats survive eviction", () => {
    for (let index = 0; index < MESSAGES_SESSION_CACHE_MAX_THREADS; index += 1) {
      const id = `c${index}`;
      setCachedThread(id, {
        conversation: thread(id),
        messages: [message(`m${index}`, id)],
      });
    }

    // Touch oldest entry, then insert a new one — c0 should survive, c1 should go.
    assert.ok(getCachedThread("c0"));
    setCachedThread("c-new", {
      conversation: thread("c-new"),
      messages: [message("m-new", "c-new")],
    });

    assert.equal(Boolean(getCachedThread("c0")), true);
    assert.equal(Boolean(getCachedThread("c1")), false);
  });

  it("indexes group chats by eventId for warm remounts", () => {
    setCachedThread("conv-g1", {
      messages: [message("gm1", "conv-g1")],
      pinnedMessage: null,
      eventId: "event-1",
      group: {
        conversationId: "conv-g1",
        eventId: "event-1",
        title: "Group",
        memberCount: 3,
        isMember: true,
        isArchived: false,
        members: [],
      },
    });

    assert.equal(getCachedThreadByEventId("event-1")?.messages[0]?.id, "gm1");
  });

  it("applies realtime message patches into the cache", () => {
    setCachedThread("c1", {
      conversation: thread("c1"),
      messages: [message("m1", "c1", { status: "sent" })],
    });

    appendCachedThreadMessage("c1", message("m2", "c1"));
    patchCachedThreadReceipts("c1", [{ messageId: "m1", status: "read" }]);
    patchCachedThreadMessageUpdated("c1", message("m2", "c1", { isDeleted: true, text: "" }));

    const cached = getCachedThread("c1");
    assert.deepEqual(cached?.messages.map((item) => item.id), ["m1", "m2"]);
    assert.equal(cached?.messages[0]?.status, "read");
    assert.equal(cached?.messages[1]?.isDeleted, true);
  });

  it("clears all session chat state (logout / user change)", () => {
    setCachedInbox([thread("c1")]);
    setCachedThread("c1", {
      conversation: thread("c1"),
      messages: [message("m1", "c1")],
      eventId: "e1",
    });

    clearMessagesSessionCache();

    assert.equal(getCachedInbox(), null);
    assert.equal(getCachedThread("c1"), null);
    assert.equal(getCachedThreadByEventId("e1"), null);
    assert.deepEqual(getCachedThreadIdsForTests(), []);
  });
});

describe("session cache wiring", () => {
  it("MessageThreadScreen hydrates from cache and uses silent reconnect loads", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessageThreadScreen.tsx"),
      "utf8",
    );
    assert.match(source, /getCachedThread/);
    assert.match(source, /setCachedThread/);
    assert.match(source, /shouldShowThreadFullScreenLoader/);
    assert.match(source, /loadThread\(activeThreadIdRef\.current, "silent"\)/);
    assert.match(source, /appendCachedThreadMessage/);
  });

  it("GroupDetailScreen uses the same session cache for warm remounts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/GroupDetailScreen.tsx"),
      "utf8",
    );
    assert.match(source, /getCachedThreadByEventId/);
    assert.match(source, /setCachedThread/);
    assert.match(source, /shouldShowThreadFullScreenLoader/);
    assert.match(source, /resolveThreadLoadMode/);
  });

  it("MessagesInboxScreen persists inbox snapshots across remounts", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessagesInboxScreen.tsx"),
      "utf8",
    );
    assert.match(source, /getCachedInbox/);
    assert.match(source, /setCachedInbox/);
  });

  it("clears the session cache when the realtime client disconnects", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/realtime/messagesRealtimeClient.ts"),
      "utf8",
    );
    assert.match(source, /clearMessagesSessionCache\(\)/);
  });
});
