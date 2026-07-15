import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ConversationMessage } from "../src/features/messages/types";
import { ALLOWED_MESSAGE_REACTIONS } from "../src/features/messages/types";
import { MESSAGE_REALTIME_EVENTS } from "../src/features/messages/realtime/messageRealtimeEvents";
import { applyMessageReactionUpdate, applyMessageUpdated } from "../src/features/messages/utils/messageReceipts";
import {
  removeViewerReaction,
  replaceViewerReaction,
} from "../src/features/messages/utils/messageReactions";
import {
  OUTGOING_TICK_PENDING_COLOR,
  OUTGOING_TICK_READ_COLOR,
  resolveMessageReceiptTickVisual,
} from "../src/features/messages/utils/messageReceiptTicks";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const message: ConversationMessage = {
  id: "message-1",
  conversationId: "conversation-1",
  sender: { id: "user-1", displayName: "Ayşe" },
  type: "text",
  text: "Merhaba",
  createdAt: "2026-07-15T00:00:00.000Z",
  status: "sent",
  reactions: [],
};

describe("message reaction state", () => {
  it("uses the exact allowed emoji set", () => {
    assert.deepEqual(ALLOWED_MESSAGE_REACTIONS, ["❤️", "😂", "👍", "😮", "😢", "🙏"]);
  });

  it("patches realtime reaction summaries without a full refresh", () => {
    const current = [message];
    const reactions = [
      { emoji: "❤️", count: 2, reactedByMe: true },
      { emoji: "👍", count: 1, reactedByMe: false },
    ];
    const next = applyMessageReactionUpdate(current, message.id, reactions);

    assert.notEqual(next, current);
    assert.deepEqual(next[0]?.reactions, reactions);
    assert.equal(applyMessageReactionUpdate(current, "missing", reactions), current);
  });

  it("replaces the viewer reaction while preserving aggregate counts", () => {
    const current = [
      { emoji: "❤️", count: 2, reactedByMe: true },
      { emoji: "👍", count: 1, reactedByMe: false },
    ];

    assert.deepEqual(replaceViewerReaction(current, "👍"), [
      { emoji: "❤️", count: 1, reactedByMe: false },
      { emoji: "👍", count: 2, reactedByMe: true },
    ]);
    assert.deepEqual(removeViewerReaction(current), [
      { emoji: "❤️", count: 1, reactedByMe: false },
      { emoji: "👍", count: 1, reactedByMe: false },
    ]);
  });

  it("keeps message:receipts and adds message:reaction", () => {
    assert.equal(MESSAGE_REALTIME_EVENTS.messageNew, "message:new");
    assert.equal(MESSAGE_REALTIME_EVENTS.conversationUpdated, "conversation:updated");
    assert.equal(MESSAGE_REALTIME_EVENTS.messageReceipts, "message:receipts");
    assert.equal(MESSAGE_REALTIME_EVENTS.messageReaction, "message:reaction");
    assert.equal(MESSAGE_REALTIME_EVENTS.messageUpdated, "message:updated");
  });

  it("patches updated messages without a full refresh", () => {
    const current = [message];
    const updated = { ...message, text: "Bu mesaj silindi", isDeleted: true, reactions: [] };
    const next = applyMessageUpdated(current, updated);
    assert.notEqual(next, current);
    assert.equal(next[0]?.isDeleted, true);
    assert.equal(applyMessageUpdated(current, { ...updated, id: "missing" }), current);
  });
});

describe("reply and reaction UI wiring", () => {
  const threadSource = source("src/features/messages/screens/MessageThreadScreen.tsx");
  const composerSource = source("src/features/messages/components/MessageComposer.tsx");
  const bubbleSource = source("src/features/messages/components/MessageBubble.tsx");
  const actionSource = source("src/features/messages/components/MessageActionSheet.tsx");
  const serviceSource = source("src/features/messages/services/messages.service.ts");

  it("opens the real action sheet from bubble long press", () => {
    assert.match(threadSource, /onLongPress=/);
    assert.match(threadSource, /setActionMessage\(item\)/);
    assert.match(threadSource, /<MessageActionSheet/);
    assert.match(actionSource, /Cevapla/);
    assert.match(actionSource, /Kopyala/);
    assert.match(actionSource, /Sil/);
    assert.doesNotMatch(actionSource, /İlet|Yıldız|Daha fazla/);
    assert.match(actionSource, /ALLOWED_MESSAGE_REACTIONS\.map/);
  });

  it("keeps the WhatsApp-style overlay light instead of full black", () => {
    assert.match(actionSource, /backgroundColor: "rgba\(17, 24, 39, 0\.14\)"/);
    assert.match(actionSource, /backgroundColor: "rgba\(255, 255, 255, 0\.94\)"/);
    assert.match(actionSource, /backgroundColor: "rgba\(255, 255, 255, 0\.96\)"/);
    assert.doesNotMatch(actionSource, /rgba\(0, 0, 0, 0\.(3[5-9]|[4-9]\d)\)/);
    assert.doesNotMatch(actionSource, /backgroundColor: "rgba\(25, 25, 25/);
    assert.doesNotMatch(actionSource, /backgroundColor: "rgba\(35, 35, 35/);
  });

  it("aligns preview and menu to the selected message direction", () => {
    assert.match(actionSource, /isMine && styles\.contentMine/);
    assert.match(actionSource, /contentMine: \{\s*alignItems: "flex-end",/);
    assert.match(actionSource, /previewBubbleMine: \{[^}]*backgroundColor: "#5B3CF6"/s);
    assert.match(actionSource, /previewTextMine: \{[^}]*color: "#FFFFFF"/s);
  });

  it("shows delete only for own messages and copy only for text messages", () => {
    assert.match(actionSource, /const canDelete = isMine && !isDeleted;/);
    assert.match(actionSource, /\{canDelete \? \(/);
    assert.match(actionSource, /const canCopy = Boolean\(message\.text\?\.trim\(\)\) && !isDeleted;/);
    assert.match(actionSource, /disabled=\{!canCopy\}/);
  });

  it("copies message text through expo-clipboard with a Turkish failure alert", () => {
    assert.match(threadSource, /from "expo-clipboard"/);
    assert.match(threadSource, /Clipboard\.setStringAsync\(copyValue\)/);
    assert.match(threadSource, /Kopyalanamadı/);
  });

  it("hides only the selected original bubble while the action sheet previews it", () => {
    assert.match(threadSource, /isHiddenForActionSheet=\{actionMessage\?\.id === item\.id\}/);
    assert.match(bubbleSource, /hiddenForActionSheet: \{\s*opacity: 0,\s*\}/);
    assert.match(bubbleSource, /isHiddenForActionSheet && styles\.hiddenForActionSheet/);
    assert.match(bubbleSource, /disabled=\{!onLongPress \|\| isHiddenForActionSheet\}/);
    // The action sheet keeps rendering its own preview bubble.
    assert.match(actionSource, /styles\.previewBubble/);
    assert.match(actionSource, /getPreviewText\(message\)/);
  });

  it("blocks actions on deleted messages", () => {
    assert.match(threadSource, /item\.type === "system" \|\| item\.isDeleted/);
    assert.match(actionSource, /\{!isDeleted \? \(/);
  });

  it("shows and cancels a reply preview above the composer", () => {
    assert.match(composerSource, /replyTarget \?/);
    assert.match(composerSource, /replyTarget\.sender\.displayName/);
    assert.match(composerSource, /onCancelReply/);
    assert.match(threadSource, /replyTarget=\{replyTarget\}/);
  });

  it("includes replyToMessageId when sending and renders reply preview in bubbles", () => {
    assert.match(threadSource, /replyToMessageId: replyTarget\?\.id/);
    assert.match(serviceSource, /\.\.\.\(replyToMessageId \? \{ replyToMessageId \} : \{\}\)/);
    assert.match(bubbleSource, /message\.replyTo \?/);
    assert.match(bubbleSource, /message\.replyTo\.sender\.displayName/);
  });

  it("adds, replaces, and removes the viewer's reaction through real endpoints", () => {
    assert.match(threadSource, /setMessageReaction/);
    assert.match(threadSource, /removeMessageReaction/);
    assert.match(threadSource, /alreadySelected/);
    assert.match(serviceSource, /method: "POST"/);
    assert.match(serviceSource, /method: "DELETE"/);
  });

  it("deletes own messages through a real endpoint and applies message:updated", () => {
    assert.match(threadSource, /deleteMessage/);
    assert.match(threadSource, /applyMessageUpdated/);
    assert.match(threadSource, /onMessageUpdated/);
    assert.match(serviceSource, /API_ENDPOINTS\.messages\.deleteMessage/);
    assert.match(serviceSource, /method: "DELETE"/);
  });

  it("renders deleted messages as a plain placeholder without ticks, reply, or reactions", () => {
    assert.match(bubbleSource, /const isDeleted = Boolean\(message\.isDeleted\);/);
    assert.match(bubbleSource, /isMine && !isDeleted \? resolveMessageReceiptTickVisual/);
    assert.match(bubbleSource, /!isDeleted && message\.replyTo/);
    assert.match(bubbleSource, /!isDeleted && message\.reactions/);
    assert.match(bubbleSource, /deletedText/);
  });

  it("renders compact highlighted reaction chips for both bubble directions", () => {
    assert.match(bubbleSource, /message\.reactions\.map/);
    assert.match(bubbleSource, /reaction\.count > 1/);
    assert.match(bubbleSource, /reaction\.reactedByMe && styles\.reactionChipMine/);
  });

  it("subscribes to reaction events and patches the active thread", () => {
    const clientSource = source("src/features/messages/realtime/messagesRealtimeClient.ts");
    const hookSource = source("src/features/messages/hooks/useMessagesRealtime.ts");
    assert.match(clientSource, /MESSAGE_REALTIME_EVENTS\.messageReaction/);
    assert.match(clientSource, /MESSAGE_REALTIME_EVENTS\.messageUpdated/);
    assert.match(hookSource, /onMessageReaction/);
    assert.match(hookSource, /onMessageUpdated/);
    assert.match(threadSource, /applyMessageReactionUpdate/);
  });
});

describe("outgoing receipt tick contrast", () => {
  it("uses light pending ticks and bright light-blue read ticks on purple", () => {
    assert.equal(OUTGOING_TICK_PENDING_COLOR, "rgba(255, 255, 255, 0.78)");
    assert.equal(OUTGOING_TICK_READ_COLOR, "#FFFFFF");
    assert.deepEqual(resolveMessageReceiptTickVisual("sent"), {
      icon: "checkmark",
      color: OUTGOING_TICK_PENDING_COLOR,
    });
    assert.deepEqual(resolveMessageReceiptTickVisual("delivered"), {
      icon: "checkmark-done",
      color: OUTGOING_TICK_PENDING_COLOR,
    });
    assert.deepEqual(resolveMessageReceiptTickVisual("read"), {
      icon: "checkmark-done",
      color: OUTGOING_TICK_READ_COLOR,
    });
  });
});
