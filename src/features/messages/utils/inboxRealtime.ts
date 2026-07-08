import type { ConversationThread } from "../types";

export function getConversationSortTimestamp(thread: ConversationThread): number {
  const candidate = thread.lastMessageAt ?? thread.updatedAt;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isConversationSnapshotNewer(
  incoming: ConversationThread,
  existing: ConversationThread,
): boolean {
  const incomingTs = getConversationSortTimestamp(incoming);
  const existingTs = getConversationSortTimestamp(existing);

  if (incomingTs !== existingTs) {
    return incomingTs > existingTs;
  }

  return incoming.updatedAt > existing.updatedAt;
}

export function sortConversationThreads(threads: ConversationThread[]): ConversationThread[] {
  return [...threads].sort((left, right) => {
    const diff = getConversationSortTimestamp(right) - getConversationSortTimestamp(left);
    if (diff !== 0) {
      return diff;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function upsertConversationThread(
  threads: ConversationThread[],
  incoming: ConversationThread,
): ConversationThread[] {
  const existing = threads.find((thread) => thread.id === incoming.id);
  if (existing && !isConversationSnapshotNewer(incoming, existing)) {
    return threads;
  }

  const withoutIncoming = threads.filter((thread) => thread.id !== incoming.id);
  return sortConversationThreads([...withoutIncoming, incoming]);
}
