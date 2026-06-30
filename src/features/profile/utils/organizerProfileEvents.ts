import type { EventItem } from "../../events/types";

const profileVisibleStatuses = new Set(["APPROVED", "COMPLETED"]);

export const isProfileVisibleOrganizerEvent = (event: EventItem) =>
  profileVisibleStatuses.has(String(event.metadata?.status ?? ""));

export const isPastOrganizerProfileEvent = (event: EventItem, now = Date.now()) => {
  const status = String(event.metadata?.status ?? "");
  if (status === "COMPLETED") {
    return true;
  }
  const endMs = event.endsAt ? new Date(event.endsAt).getTime() : new Date(event.startsAt).getTime();
  return endMs < now;
};

export const splitOrganizerProfileEvents = (events: EventItem[], now = Date.now()) => {
  const visible = events.filter(isProfileVisibleOrganizerEvent);
  const active = visible
    .filter((event) => !isPastOrganizerProfileEvent(event, now))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = visible
    .filter((event) => isPastOrganizerProfileEvent(event, now))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return { active, past };
};
