import type { ConversationMessage } from "../types";

export const SHARED_MEDIA_PREVIEW_LIMIT = 6;

export function resolveSharedMediaPreviewItems(
  items: ConversationMessage[],
  limit = SHARED_MEDIA_PREVIEW_LIMIT,
): ConversationMessage[] {
  return items.filter((item) => Boolean(item.mediaUrl)).slice(0, limit);
}

export function hasSharedMediaPreview(items: ConversationMessage[]): boolean {
  return resolveSharedMediaPreviewItems(items).length > 0;
}
