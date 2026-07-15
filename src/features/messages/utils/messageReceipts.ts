import type { ConversationMessage, MessageReactionSummary } from "../types";
import { mergeMessageReceiptStatus } from "./messageReceiptTicks";

export type MessageReceiptUpdate = {
  messageId: string;
  status: "delivered" | "read";
};

/** Patch message statuses from a realtime message:receipts payload without a full refresh. */
export function applyMessageReceiptUpdates(
  messages: ConversationMessage[],
  updates: MessageReceiptUpdate[],
): ConversationMessage[] {
  if (updates.length === 0) {
    return messages;
  }

  const nextById = new Map(updates.map((update) => [update.messageId, update.status]));
  let changed = false;

  const nextMessages = messages.map((message) => {
    const nextStatus = nextById.get(message.id);
    if (!nextStatus) {
      return message;
    }

    const merged = mergeMessageReceiptStatus(message.status, nextStatus);
    if (merged === message.status) {
      return message;
    }

    changed = true;
    return { ...message, status: merged };
  });

  return changed ? nextMessages : messages;
}

export function applyMessageReactionUpdate(
  messages: ConversationMessage[],
  messageId: string,
  reactions: MessageReactionSummary[],
): ConversationMessage[] {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index < 0) {
    return messages;
  }

  return messages.map((message) =>
    message.id === messageId ? { ...message, reactions } : message,
  );
}

/**
 * Show the incoming DM avatar only on the last bubble of a consecutive same-sender cluster
 * so stacked replies stay clean.
 */
export function shouldShowIncomingDmAvatar(input: {
  message: ConversationMessage;
  nextMessage?: ConversationMessage | null;
  viewerId: string;
}): boolean {
  const { message, nextMessage, viewerId } = input;
  if (message.type === "system") {
    return false;
  }
  if (message.sender.id === viewerId) {
    return false;
  }
  if (!nextMessage || nextMessage.type === "system") {
    return true;
  }
  return nextMessage.sender.id !== message.sender.id;
}

export function isConsecutiveSameSender(
  message: ConversationMessage,
  previousMessage?: ConversationMessage | null,
): boolean {
  if (!previousMessage || message.type === "system" || previousMessage.type === "system") {
    return false;
  }
  return previousMessage.sender.id === message.sender.id;
}
