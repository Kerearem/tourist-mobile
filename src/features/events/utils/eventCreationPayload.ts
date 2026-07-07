import type { CreateEventInput } from "../types";
import type { EventCreationDraft } from "../types/eventCreation";
import { buildCreateEventTicketPayload } from "./eventTicketPricing";
import {
  isValidIanaTimezone,
  normalizeIanaTimezone,
  wallClockFromDate,
  wallClockToUtc,
} from "./eventTimezone";

export type CreateEventPayloadResult =
  | { ok: true; payload: CreateEventInput }
  | { ok: false; reason: "timezone" | "conversion" | "ticket" };

export function buildCreateEventPayload(
  draft: EventCreationDraft,
  capacity: number,
): CreateEventPayloadResult {
  const trimmedTitle = draft.title.trim();
  const trimmedDescription = draft.description.trim();
  const trimmedVenue = draft.venueName.trim();
  const trimmedCity = draft.city.trim();
  const trimmedCountryCode = draft.countryCode.trim().toUpperCase();
  const timezone = normalizeIanaTimezone(draft.timezone);

  if (!draft.eventType) {
    return { ok: false, reason: "conversion" };
  }

  if (!timezone) {
    return { ok: false, reason: "timezone" };
  }

  const startsAtUtc = wallClockToUtc(wallClockFromDate(draft.startsAt), timezone);
  const endsAtUtc = wallClockToUtc(wallClockFromDate(draft.endsAt), timezone);

  if (!startsAtUtc.ok || !endsAtUtc.ok) {
    return { ok: false, reason: "conversion" };
  }

  const ticketPayload = buildCreateEventTicketPayload(draft.ticketMode, draft.tokenPriceInput);
  if (!ticketPayload) {
    return { ok: false, reason: "ticket" };
  }

  return {
    ok: true,
    payload: {
      title: trimmedTitle,
      description: trimmedDescription,
      type: draft.eventType,
      startsAt: startsAtUtc.iso,
      endsAt: endsAtUtc.iso,
      venueName: trimmedVenue,
      city: trimmedCity,
      countryCode: trimmedCountryCode,
      timezone,
      capacity,
      visibility: draft.visibility,
      isPaid: ticketPayload.isPaid,
      tokenPrice: ticketPayload.tokenPrice,
      requiresApproval: false,
      ...(draft.minAge != null ? { minAge: draft.minAge } : {}),
      hasAlcohol: draft.minAge != null ? draft.hasAlcohol : false,
      smokingAllowed: draft.smokingAllowed,
    },
  };
}

export { isValidIanaTimezone, normalizeIanaTimezone };

export function shouldUploadCoverOnSubmit(draft: EventCreationDraft): boolean {
  return Boolean(draft.coverUri);
}
