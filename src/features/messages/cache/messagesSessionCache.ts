import type { EventGroupInfo } from "../../events/services/eventGroup.service";
import type {
  ConversationMessage,
  ConversationThread,
  MessageReactionSummary,
} from "../types";
import { appendMessageDeduped } from "../utils/threadRealtime";
import {
  applyMessageReactionUpdate,
  applyMessageReceiptUpdates,
  applyMessageUpdated,
  type MessageReceiptUpdate,
} from "../utils/messageReceipts";

/** In-session only — never persisted. Caps warm threads so memory stays bounded. */
export const MESSAGES_SESSION_CACHE_MAX_THREADS = 10;

export type CachedThreadSnapshot = {
  conversation: ConversationThread | null;
  messages: ConversationMessage[];
  pinnedMessage: ConversationMessage | null;
  group: EventGroupInfo | null;
  eventId: string | null;
  updatedAt: number;
};

type ThreadEntry = CachedThreadSnapshot;

let inboxCache: ConversationThread[] | null = null;
/** Insertion-order Map used as a simple LRU (re-set moves an entry to the end). */
const threadByConversationId = new Map<string, ThreadEntry>();
const conversationIdByEventId = new Map<string, string>();

function touchThread(conversationId: string, entry: ThreadEntry): void {
  threadByConversationId.delete(conversationId);
  threadByConversationId.set(conversationId, entry);

  while (threadByConversationId.size > MESSAGES_SESSION_CACHE_MAX_THREADS) {
    const oldestKey = threadByConversationId.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    const oldest = threadByConversationId.get(oldestKey);
    threadByConversationId.delete(oldestKey);
    if (oldest?.eventId) {
      conversationIdByEventId.delete(oldest.eventId);
    }
  }
}

function readThread(conversationId: string): ThreadEntry | null {
  const entry = threadByConversationId.get(conversationId);
  if (!entry) {
    return null;
  }
  // LRU touch on read so recently viewed chats stay warm.
  touchThread(conversationId, entry);
  return entry;
}

export function getCachedInbox(): ConversationThread[] | null {
  return inboxCache;
}

export function setCachedInbox(threads: ConversationThread[]): void {
  inboxCache = threads;
}

export function getCachedThread(conversationId: string): CachedThreadSnapshot | null {
  return readThread(conversationId);
}

export function getCachedThreadByEventId(eventId: string): CachedThreadSnapshot | null {
  const conversationId = conversationIdByEventId.get(eventId);
  if (!conversationId) {
    return null;
  }
  return readThread(conversationId);
}

export function setCachedThread(
  conversationId: string,
  input: {
    conversation?: ConversationThread | null;
    messages: ConversationMessage[];
    pinnedMessage?: ConversationMessage | null;
    group?: EventGroupInfo | null;
    eventId?: string | null;
  },
): void {
  const previous = threadByConversationId.get(conversationId);
  if (previous?.eventId && previous.eventId !== (input.eventId ?? previous.eventId)) {
    conversationIdByEventId.delete(previous.eventId);
  }

  const eventId = input.eventId !== undefined ? input.eventId : (previous?.eventId ?? null);
  const entry: ThreadEntry = {
    conversation: input.conversation !== undefined ? input.conversation : (previous?.conversation ?? null),
    messages: input.messages,
    pinnedMessage:
      input.pinnedMessage !== undefined ? input.pinnedMessage : (previous?.pinnedMessage ?? null),
    group: input.group !== undefined ? input.group : (previous?.group ?? null),
    eventId,
    updatedAt: Date.now(),
  };

  touchThread(conversationId, entry);
  if (eventId) {
    conversationIdByEventId.set(eventId, conversationId);
  }
}

export function patchCachedThreadMessages(
  conversationId: string,
  updater: (messages: ConversationMessage[]) => ConversationMessage[],
): ConversationMessage[] | null {
  const entry = threadByConversationId.get(conversationId);
  if (!entry) {
    return null;
  }

  const nextMessages = updater(entry.messages);
  if (nextMessages === entry.messages) {
    return entry.messages;
  }

  touchThread(conversationId, {
    ...entry,
    messages: nextMessages,
    updatedAt: Date.now(),
  });
  return nextMessages;
}

export function appendCachedThreadMessage(
  conversationId: string,
  message: ConversationMessage,
): void {
  patchCachedThreadMessages(conversationId, (messages) => appendMessageDeduped(messages, message));
}

export function patchCachedThreadReceipts(
  conversationId: string,
  updates: MessageReceiptUpdate[],
): void {
  patchCachedThreadMessages(conversationId, (messages) =>
    applyMessageReceiptUpdates(messages, updates),
  );
}

export function patchCachedThreadReaction(
  conversationId: string,
  messageId: string,
  reactions: MessageReactionSummary[],
): void {
  patchCachedThreadMessages(conversationId, (messages) =>
    applyMessageReactionUpdate(messages, messageId, reactions),
  );
}

export function patchCachedThreadMessageUpdated(
  conversationId: string,
  message: ConversationMessage,
): void {
  patchCachedThreadMessages(conversationId, (messages) => applyMessageUpdated(messages, message));
}

export function patchCachedThreadConversation(
  conversationId: string,
  conversation: ConversationThread,
): void {
  const entry = threadByConversationId.get(conversationId);
  if (!entry) {
    return;
  }

  touchThread(conversationId, {
    ...entry,
    conversation,
    updatedAt: Date.now(),
  });
}

/** Clears all session chat state — call on logout / auth loss. */
export function clearMessagesSessionCache(): void {
  inboxCache = null;
  threadByConversationId.clear();
  conversationIdByEventId.clear();
}

/** Test helper: current LRU keys from oldest → newest. */
export function getCachedThreadIdsForTests(): string[] {
  return [...threadByConversationId.keys()];
}
