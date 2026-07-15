import type { MessageStatus } from "../types";

export type MessageReceiptTickVisual = {
  /** Ionicons name for the receipt indicator. */
  icon: "checkmark" | "checkmark-done";
  color: string;
};

/** High-contrast palette for receipt ticks rendered on purple outgoing bubbles. */
export const OUTGOING_TICK_PENDING_COLOR = "rgba(255, 255, 255, 0.78)";
export const OUTGOING_TICK_READ_COLOR = "#FFFFFF";

/**
 * Maps outbound receipt status to WhatsApp-style ticks:
 * - sent → single gray
 * - delivered → double gray
 * - read → double blue
 */
export function resolveMessageReceiptTickVisual(
  status: MessageStatus | undefined | null,
): MessageReceiptTickVisual | null {
  if (!status) {
    return null;
  }

  if (status === "sent") {
    return { icon: "checkmark", color: OUTGOING_TICK_PENDING_COLOR };
  }

  if (status === "delivered") {
    return { icon: "checkmark-done", color: OUTGOING_TICK_PENDING_COLOR };
  }

  if (status === "read") {
    return { icon: "checkmark-done", color: OUTGOING_TICK_READ_COLOR };
  }

  return null;
}

const STATUS_RANK: Record<MessageStatus, number> = {
  sent: 0,
  delivered: 1,
  read: 2,
};

/** Never downgrade a receipt (read must not become delivered). */
export function mergeMessageReceiptStatus(
  current: MessageStatus | undefined,
  next: MessageStatus,
): MessageStatus {
  if (!current) {
    return next;
  }
  return STATUS_RANK[next] >= STATUS_RANK[current] ? next : current;
}
