import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { unhideConversationId } from "../src/features/messages/utils/inboxHiddenConversations";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("inbox hidden conversation revive", () => {
  it("removes a conversation id from the local hide set", () => {
    const hidden = new Set(["c1", "c2"]);
    const next = unhideConversationId(hidden, "c1");
    assert.equal(next.has("c1"), false);
    assert.equal(next.has("c2"), true);
    assert.notEqual(next, hidden);
  });

  it("returns the same set when the id was not hidden", () => {
    const hidden = new Set(["c2"]);
    const next = unhideConversationId(hidden, "c1");
    assert.equal(next, hidden);
  });

  it("MessagesInboxScreen unhides on conversationUpdated and messageNew", () => {
    const inbox = source("src/features/messages/screens/MessagesInboxScreen.tsx");
    assert.match(inbox, /unhideConversationId/);
    assert.match(inbox, /onConversationUpdated/);
    assert.match(inbox, /onMessageNew/);
    assert.match(
      inbox,
      /setHiddenIds\(\(prev\) => unhideConversationId\(prev, conversation\.id\)\)/,
    );
    assert.match(
      inbox,
      /setHiddenIds\(\(prev\) => unhideConversationId\(prev, event\.payload\.conversationId\)\)/,
    );
  });

  it("MessageRequestsScreen mirrors the same unhide path", () => {
    const requests = source("src/features/messages/screens/MessageRequestsScreen.tsx");
    assert.match(requests, /unhideConversationId/);
    assert.match(requests, /onMessageNew/);
  });
});
