import type { MessageStatus } from "../types";

export type MessageReceiptTickVisual = {
  /** Ionicons name for the receipt indicator. */
  icon: "checkmark" | "checkmark-done";
  color: string;
};

const TICK_GRAY = "#94A3B8";
const TICK_BLUE = "#2563EB";

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
    return { icon: "checkmark", color: TICK_GRAY };
  }

  if (status === "delivered") {
    return { icon: "checkmark-done", color: TICK_GRAY };
  }

  if (status === "read") {
    return { icon: "checkmark-done", color: TICK_BLUE };
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
