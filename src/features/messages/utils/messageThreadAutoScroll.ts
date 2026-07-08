export type MessageThreadAutoScrollReason =
  | "initial_load"
  | "keyboard_opened"
  | "own_message_sent"
  | "incoming_message";

export function shouldScrollMessageThread(
  reason: MessageThreadAutoScrollReason | null,
  messageCount: number,
): boolean {
  return reason !== null && messageCount > 0;
}

export function shouldRunInitialScroll(
  hasScrolledInitial: boolean,
  messageCount: number,
  isLoading: boolean,
): boolean {
  return !isLoading && !hasScrolledInitial && messageCount > 0;
}

export function shouldScrollOnKeyboardDidShow(
  messageCount: number,
  hasConsumedKeyboardScroll: boolean,
): boolean {
  return messageCount > 0 && !hasConsumedKeyboardScroll;
}

export function shouldScrollOnKeyboardDidHide(): boolean {
  return false;
}

export function consumePendingScrollReason(
  pendingReason: MessageThreadAutoScrollReason | null,
  messageCount: number,
): { shouldScroll: boolean; nextPendingReason: MessageThreadAutoScrollReason | null } {
  if (!shouldScrollMessageThread(pendingReason, messageCount)) {
    return { shouldScroll: false, nextPendingReason: pendingReason };
  }

  return { shouldScroll: true, nextPendingReason: null };
}

export function resolveIncomingMessageScrollPlan(isNearBottom: boolean): {
  shouldScroll: boolean;
} {
  return {
    shouldScroll: isNearBottom,
  };
}

export function resolveOwnMessageSentScrollPlan(messageCount: number): {
  pendingReason: "own_message_sent";
  shouldScrollImmediately: boolean;
} {
  return {
    pendingReason: "own_message_sent",
    shouldScrollImmediately: messageCount > 0,
  };
}
