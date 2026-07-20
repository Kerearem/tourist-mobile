/**
 * Local inbox "Sil" only adds an id to hiddenIds. When the peer messages again,
 * conversation:updated / message:new must clear that id so the thread reappears
 * without requiring an app restart.
 */
export function unhideConversationId(
  hiddenIds: ReadonlySet<string>,
  conversationId: string,
): Set<string> {
  if (!hiddenIds.has(conversationId)) {
    return hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds);
  }
  const next = new Set(hiddenIds);
  next.delete(conversationId);
  return next;
}
