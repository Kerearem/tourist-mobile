export type EventTicketTier = "free" | "token";

/** PostgreSQL INT4 upper bound — technical limit, not a product pricing cap. */
export const MAX_EVENT_TOKEN_PRICE = 2_147_483_647;

export const LEGACY_TICKET_UPDATING_LABEL = "Bilet fiyatı güncelleniyor";

export type EventTicketDisplayInput = {
  tokenPrice?: number;
  ticketAvailable?: boolean;
  metadata?: { isPaid?: boolean };
};

export function resolveEventTokenPrice(event: EventTicketDisplayInput): number {
  if (typeof event.tokenPrice === "number" && Number.isFinite(event.tokenPrice)) {
    return Math.max(0, Math.trunc(event.tokenPrice));
  }
  return 0;
}

export function isLegacyInconsistentPaidTicket(event: EventTicketDisplayInput): boolean {
  return event.metadata?.isPaid === true && resolveEventTokenPrice(event) <= 0;
}

export function resolveEventTicketAvailable(event: EventTicketDisplayInput): boolean {
  if (typeof event.ticketAvailable === "boolean") {
    return event.ticketAvailable;
  }
  return !isLegacyInconsistentPaidTicket(event);
}

export function isTokenTicketEvent(tokenPrice: number): boolean {
  return tokenPrice > 0;
}

export function formatEventTicketCardLabel(event: EventTicketDisplayInput): string {
  if (isLegacyInconsistentPaidTicket(event)) {
    return LEGACY_TICKET_UPDATING_LABEL;
  }

  const tokenPrice = resolveEventTokenPrice(event);
  if (tokenPrice <= 0) {
    return "Ücretsiz · bilet gerekmez";
  }
  return `${tokenPrice} token · kişi başı`;
}

export function formatEventTicketOfferingLabel(event: EventTicketDisplayInput): string {
  if (isLegacyInconsistentPaidTicket(event)) {
    return LEGACY_TICKET_UPDATING_LABEL;
  }

  const tokenPrice = resolveEventTokenPrice(event);
  if (tokenPrice <= 0) {
    return "Ücretsiz";
  }
  return `${tokenPrice} token · kişi başı`;
}

export type AttendanceUiState = "idle" | "pending" | "approved";

export function formatEventJoinCtaLabel(tokenPrice: number, attendanceState: AttendanceUiState): string {
  if (attendanceState === "approved") {
    return "Ayrıl";
  }
  if (attendanceState === "pending") {
    return "İptal Et";
  }
  if (tokenPrice > 0) {
    return `${tokenPrice} token ile katıl`;
  }
  return "Katıl";
}

export function canAttemptEventJoin(event: EventTicketDisplayInput, attendanceState: AttendanceUiState): boolean {
  if (attendanceState !== "idle") {
    return true;
  }
  return resolveEventTicketAvailable(event);
}

export function parseTokenPriceInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > MAX_EVENT_TOKEN_PRICE) {
    return null;
  }
  return parsed;
}

export function resolveCreateEventTicketTier(isPaid: boolean): EventTicketTier {
  return isPaid ? "token" : "free";
}

export function buildCreateEventTicketPayload(tier: EventTicketTier, tokenPriceInput: string) {
  if (tier === "free") {
    return { isPaid: false as const, tokenPrice: 0 };
  }

  const tokenPrice = parseTokenPriceInput(tokenPriceInput);
  if (tokenPrice == null) {
    return null;
  }

  return { isPaid: true as const, tokenPrice };
}
