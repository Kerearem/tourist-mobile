import type { ConversationThread } from "../types";
import { isConversationSnapshotNewer, sortConversationThreads } from "./inboxRealtime";

export function isPendingMessageRequest(conversation: ConversationThread): boolean {
  return conversation.metadata?.isRequestPending === "true";
}

export function upsertRequestThread(
  threads: ConversationThread[],
  incoming: ConversationThread,
): ConversationThread[] {
  if (!isPendingMessageRequest(incoming)) {
    return threads;
  }

  const existing = threads.find((thread) => thread.id === incoming.id);
  if (existing && !isConversationSnapshotNewer(incoming, existing)) {
    return threads;
  }

  const withoutIncoming = threads.filter((thread) => thread.id !== incoming.id);
  return sortConversationThreads([...withoutIncoming, incoming]);
}

export function removeRequestThread(threads: ConversationThread[], conversationId: string): ConversationThread[] {
  return threads.filter((thread) => thread.id !== conversationId);
}

export function applyRequestConversationRealtimeUpdate(
  threads: ConversationThread[],
  incoming: ConversationThread,
): ConversationThread[] {
  if (isPendingMessageRequest(incoming)) {
    return upsertRequestThread(threads, incoming);
  }

  return removeRequestThread(threads, incoming.id);
}
