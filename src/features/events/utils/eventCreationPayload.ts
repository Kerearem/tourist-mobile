import type { CreateEventInput } from "../types";
import type { EventCreationDraft } from "../types/eventCreation";
import { buildCreateEventTicketPayload } from "./eventTicketPricing";

export function resolveDeviceTimezone(): string | undefined {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof timezone === "string" && timezone.trim()) {
      return timezone.trim();
    }
  } catch {
    // Ignore unsupported Intl environments.
  }
  return undefined;
}

export function buildCreateEventPayload(draft: EventCreationDraft, capacity: number): CreateEventInput | null {
  const trimmedTitle = draft.title.trim();
  const trimmedDescription = draft.description.trim();
  const trimmedVenue = draft.venueName.trim();
  const trimmedCity = draft.city.trim();
  const trimmedCountryCode = draft.countryCode.trim().toUpperCase();

  if (!draft.eventType) {
    return null;
  }

  const ticketPayload = buildCreateEventTicketPayload(draft.ticketMode, draft.tokenPriceInput);
  if (!ticketPayload) {
    return null;
  }

  const timezone = draft.timezone?.trim() || resolveDeviceTimezone();

  return {
    title: trimmedTitle,
    description: trimmedDescription,
    type: draft.eventType,
    startsAt: draft.startsAt.toISOString(),
    endsAt: draft.endsAt.toISOString(),
    venueName: trimmedVenue,
    city: trimmedCity,
    countryCode: trimmedCountryCode,
    ...(timezone ? { timezone } : {}),
    capacity,
    visibility: draft.visibility,
    isPaid: ticketPayload.isPaid,
    tokenPrice: ticketPayload.tokenPrice,
    requiresApproval: false,
    ...(draft.minAge != null ? { minAge: draft.minAge } : {}),
    hasAlcohol: draft.minAge != null ? draft.hasAlcohol : false,
    smokingAllowed: draft.smokingAllowed,
  };
}

export function shouldUploadCoverOnSubmit(draft: EventCreationDraft): boolean {
  return Boolean(draft.coverUri);
}
