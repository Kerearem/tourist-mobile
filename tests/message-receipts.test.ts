import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ConversationMessage } from "../src/features/messages/types";
import {
  applyMessageReceiptUpdates,
  shouldShowIncomingDmAvatar,
} from "../src/features/messages/utils/messageReceipts";
import {
  mergeMessageReceiptStatus,
  resolveMessageReceiptTickVisual,
} from "../src/features/messages/utils/messageReceiptTicks";
import { MESSAGE_REALTIME_EVENTS } from "../src/features/messages/realtime/messageRealtimeEvents";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const makeMessage = (
  overrides: Partial<ConversationMessage> & Pick<ConversationMessage, "id" | "sender">,
): ConversationMessage => ({
  conversationId: "conv-1",
  type: "text",
  text: "hello",
  createdAt: "2026-07-14T12:00:00.000Z",
  ...overrides,
});

describe("message receipt tick visuals", () => {
  it("maps sent / delivered / read to single gray, double gray, and double blue", () => {
    assert.deepEqual(resolveMessageReceiptTickVisual("sent"), {
      icon: "checkmark",
      color: "rgba(255, 255, 255, 0.78)",
    });
    assert.deepEqual(resolveMessageReceiptTickVisual("delivered"), {
      icon: "checkmark-done",
      color: "rgba(255, 255, 255, 0.78)",
    });
    assert.deepEqual(resolveMessageReceiptTickVisual("read"), {
      icon: "checkmark-done",
      color: "#BFDBFE",
    });
    assert.equal(resolveMessageReceiptTickVisual(undefined), null);
  });

  it("never downgrades receipt status", () => {
    assert.equal(mergeMessageReceiptStatus("read", "delivered"), "read");
    assert.equal(mergeMessageReceiptStatus("delivered", "sent"), "delivered");
    assert.equal(mergeMessageReceiptStatus("sent", "delivered"), "delivered");
  });
});

describe("incoming DM avatar clustering", () => {
  const viewerId = "me";
  const peer = { id: "peer", displayName: "Peer" };
  const me = { id: viewerId, displayName: "Me" };

  it("shows avatar on the last incoming message of a cluster", () => {
    const first = makeMessage({ id: "1", sender: peer });
    const second = makeMessage({ id: "2", sender: peer });
    assert.equal(
      shouldShowIncomingDmAvatar({ message: first, nextMessage: second, viewerId }),
      false,
    );
    assert.equal(
      shouldShowIncomingDmAvatar({ message: second, nextMessage: null, viewerId }),
      true,
    );
  });

  it("hides avatar on outgoing messages", () => {
    const mine = makeMessage({ id: "3", sender: me });
    assert.equal(shouldShowIncomingDmAvatar({ message: mine, viewerId }), false);
  });
});

describe("applyMessageReceiptUpdates", () => {
  it("updates matching outgoing message statuses without a full refresh", () => {
    const messages = [
      makeMessage({ id: "a", sender: { id: "me", displayName: "Me" }, status: "sent" }),
      makeMessage({ id: "b", sender: { id: "me", displayName: "Me" }, status: "delivered" }),
    ];

    const next = applyMessageReceiptUpdates(messages, [
      { messageId: "a", status: "delivered" },
      { messageId: "b", status: "read" },
    ]);

    assert.equal(next[0]?.status, "delivered");
    assert.equal(next[1]?.status, "read");
  });
});

describe("DM receipt UI wiring", () => {
  it("renders receipt ticks for outgoing DM bubbles", () => {
    const bubbleSource = readSource("src/features/messages/components/MessageBubble.tsx");
    assert.match(bubbleSource, /resolveMessageReceiptTickVisual/);
    assert.match(bubbleSource, /receiptTick/);
    assert.match(bubbleSource, /name=\{receiptTick\.icon\}/);

    const tickSource = readSource("src/features/messages/utils/messageReceiptTicks.ts");
    assert.match(tickSource, /checkmark-done/);
    assert.match(tickSource, /"checkmark"/);
  });

  it("MessageThreadScreen applies realtime receipt updates and avatar clustering", () => {
    const threadSource = readSource("src/features/messages/screens/MessageThreadScreen.tsx");
    assert.match(threadSource, /onMessageReceipts/);
    assert.match(threadSource, /applyMessageReceiptUpdates/);
    assert.match(threadSource, /shouldShowIncomingDmAvatar/);
    assert.match(threadSource, /showIncomingAvatar=/);
  });

  it("subscribes to message:receipts in the realtime client", () => {
    assert.equal(MESSAGE_REALTIME_EVENTS.messageReceipts, "message:receipts");
    const clientSource = readSource("src/features/messages/realtime/messagesRealtimeClient.ts");
    assert.match(clientSource, /messageReceipts/);
    assert.match(clientSource, /onMessageReceipts/);
  });
});
