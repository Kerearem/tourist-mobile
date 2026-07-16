import type { EventItem } from "../types";

export function formatEventCardRating(event: EventItem): string | null {
  if (event.averageRating == null || !event.ratingCount) {
    return null;
  }

  return event.averageRating.toFixed(1);
}

export function formatEventCardAttendance(
  event: Pick<EventItem, "attendeeCount" | "capacity">,
  options?: { isOwnEvent?: boolean },
): string {
  const attendeeCount = Math.max(0, event.attendeeCount);

  if (attendeeCount === 0) {
    // Organizers cannot join their own event, so the "be first" nudge is wrong there.
    return options?.isOwnEvent ? "Henüz katılımcı yok" : "İlk katılımcı sen ol";
  }

  if (event.capacity && event.capacity > 0) {
    return `${attendeeCount} / ${event.capacity} katılımcı`;
  }

  return `${attendeeCount} katılımcı`;
}
