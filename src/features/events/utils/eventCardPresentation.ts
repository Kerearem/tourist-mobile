import type { EventItem } from "../types";

export function formatEventCardRating(event: EventItem): string | null {
  if (event.averageRating == null || !event.ratingCount) {
    return null;
  }

  return event.averageRating.toFixed(1);
}

export function formatEventCardAttendance(event: Pick<EventItem, "attendeeCount" | "capacity">): string {
  const attendeeCount = Math.max(0, event.attendeeCount);

  if (attendeeCount === 0) {
    return "İlk katılımcı sen ol";
  }

  if (event.capacity && event.capacity > 0) {
    return `${attendeeCount} / ${event.capacity} katılımcı`;
  }

  return `${attendeeCount} katılımcı`;
}
