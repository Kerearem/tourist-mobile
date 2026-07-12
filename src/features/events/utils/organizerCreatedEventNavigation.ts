import type { EventItem } from "../types";

export type OrganizerEventSubmissionSnapshot = {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  city: string;
  countryCode: string;
  venueName?: string;
  timezone?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  minAge?: number | null;
  hasAlcohol?: boolean;
  smokingAllowed?: boolean;
  tokenPrice: number;
  visibility?: string;
  status: string;
};

export type OrganizerCreatedEventPressTarget =
  | { kind: "public-detail"; eventId: string }
  | { kind: "submission-detail"; event: OrganizerEventSubmissionSnapshot }
  | { kind: "album"; eventId: string };

export function resolveOrganizerEventStatus(event: EventItem): string {
  const status = event.metadata?.status;
  return typeof status === "string" ? status : "";
}

export function toOrganizerEventSubmissionSnapshot(event: EventItem): OrganizerEventSubmissionSnapshot {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    ...(event.coverImageUrl ? { coverImageUrl: event.coverImageUrl } : {}),
    city: event.city,
    countryCode: event.countryCode,
    ...(event.venueName ? { venueName: event.venueName } : {}),
    ...(event.timezone ? { timezone: event.timezone } : {}),
    startsAt: event.startsAt,
    ...(event.endsAt ? { endsAt: event.endsAt } : {}),
    ...(event.capacity != null ? { capacity: event.capacity } : {}),
    minAge: event.minAge ?? null,
    hasAlcohol: event.hasAlcohol ?? false,
    smokingAllowed: event.smokingAllowed ?? false,
    tokenPrice: event.tokenPrice,
    visibility: event.visibility,
    status: resolveOrganizerEventStatus(event),
  };
}

export function resolveOrganizerCreatedEventPressTarget(event: EventItem): OrganizerCreatedEventPressTarget {
  const status = resolveOrganizerEventStatus(event);

  if (status === "APPROVED") {
    return { kind: "public-detail", eventId: event.id };
  }

  if (status === "COMPLETED") {
    return { kind: "album", eventId: event.id };
  }

  if (status === "PENDING_REVIEW" || status === "REJECTED" || status === "CANCELLED" || status === "DRAFT") {
    return { kind: "submission-detail", event: toOrganizerEventSubmissionSnapshot(event) };
  }

  return { kind: "submission-detail", event: toOrganizerEventSubmissionSnapshot(event) };
}

export function shouldUsePublicEventDetailForOrganizerEvent(event: EventItem): boolean {
  return resolveOrganizerCreatedEventPressTarget(event).kind === "public-detail";
}
