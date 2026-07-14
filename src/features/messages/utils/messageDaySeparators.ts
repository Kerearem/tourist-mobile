import type { ConversationMessage } from "../types";

const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/**
 * WhatsApp-style day separator label using the device's local calendar:
 * today → "Bugün", yesterday → "Dün", otherwise "14 Temmuz 2026".
 */
export function formatMessageDayLabel(createdAt: string, now: Date = new Date()): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (isSameCalendarDay(date, now)) {
    return "Bugün";
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) {
    return "Dün";
  }

  return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Show a separator before the first message and whenever the calendar day changes. */
export function shouldShowDaySeparator(
  message: ConversationMessage,
  previousMessage?: ConversationMessage | null,
): boolean {
  const messageDate = new Date(message.createdAt);
  if (Number.isNaN(messageDate.getTime())) {
    return false;
  }

  if (!previousMessage) {
    return true;
  }

  const previousDate = new Date(previousMessage.createdAt);
  if (Number.isNaN(previousDate.getTime())) {
    return true;
  }

  return !isSameCalendarDay(messageDate, previousDate);
}
