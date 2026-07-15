import type {
  AllowedMessageReaction,
  MessageReactionSummary,
} from "../types";

/** Applies the viewer's one-reaction-per-message replacement to a compact summary. */
export function replaceViewerReaction(
  reactions: MessageReactionSummary[],
  emoji: AllowedMessageReaction,
): MessageReactionSummary[] {
  const withoutViewer = removeViewerReaction(reactions);
  const existing = withoutViewer.find((reaction) => reaction.emoji === emoji);

  if (existing) {
    return withoutViewer.map((reaction) =>
      reaction.emoji === emoji
        ? { ...reaction, count: reaction.count + 1, reactedByMe: true }
        : reaction,
    );
  }

  return [...withoutViewer, { emoji, count: 1, reactedByMe: true }];
}

/** Removes only the viewer's contribution, preserving other users' count. */
export function removeViewerReaction(
  reactions: MessageReactionSummary[],
): MessageReactionSummary[] {
  return reactions.flatMap((reaction) => {
    if (!reaction.reactedByMe) {
      return reaction;
    }

    const count = reaction.count - 1;
    return count > 0 ? [{ ...reaction, count, reactedByMe: false }] : [];
  });
}
