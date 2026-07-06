import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCreateEventTicketPayload,
  canAttemptEventJoin,
  formatEventJoinCtaLabel,
  formatEventTicketCardLabel,
  formatEventTicketOfferingLabel,
  isLegacyInconsistentPaidTicket,
  isTokenTicketEvent,
  LEGACY_TICKET_UPDATING_LABEL,
  MAX_EVENT_TOKEN_PRICE,
  parseTokenPriceInput,
  resolveCreateEventTicketTier,
  resolveEventTicketAvailable,
  resolveEventTokenPrice,
} from "../src/features/events/utils/eventTicketPricing";
import type { CreateEventInput } from "../src/features/events/types";
import {
  EVENT_ATTENDANCE_ERROR_FALLBACK,
  resolveEventAttendanceError,
} from "../src/features/events/utils/resolveEventAttendanceError";

const LEGACY_TICKET_UNAVAILABLE_MESSAGE =
  "Bu etkinliğin bilet fiyatı güncelleniyor. Lütfen daha sonra tekrar dene.";

type CreateEventPricingKeys = Extract<keyof CreateEventInput, "price" | "priceCurrency">;
type AssertNoFiatCreatePricing = CreateEventPricingKeys extends never ? true : never;

const assertNoFiatCreatePricing: AssertNoFiatCreatePricing = true;

describe("eventTicketPricing", () => {
  it("resolves tokenPrice from event payload", () => {
    assert.equal(resolveEventTokenPrice({ tokenPrice: 12 }), 12);
    assert.equal(resolveEventTokenPrice({ tokenPrice: 0 }), 0);
    assert.equal(resolveEventTokenPrice({ metadata: { isPaid: true } }), 0);
  });

  it("formats card labels for free and token events", () => {
    assert.equal(formatEventTicketCardLabel({ tokenPrice: 0 }), "Ücretsiz · bilet gerekmez");
    assert.equal(formatEventTicketCardLabel({ tokenPrice: 5 }), "5 token · kişi başı");
  });

  it("formats legacy inconsistent paid events as updating ticket price", () => {
    const legacyEvent = { tokenPrice: 0, metadata: { isPaid: true } };
    assert.equal(formatEventTicketCardLabel(legacyEvent), LEGACY_TICKET_UPDATING_LABEL);
    assert.equal(formatEventTicketOfferingLabel(legacyEvent), LEGACY_TICKET_UPDATING_LABEL);
    assert.equal(isLegacyInconsistentPaidTicket(legacyEvent), true);
    assert.equal(resolveEventTicketAvailable(legacyEvent), false);
  });

  it("formats offering labels", () => {
    assert.equal(formatEventTicketOfferingLabel({ tokenPrice: 0 }), "Ücretsiz");
    assert.equal(formatEventTicketOfferingLabel({ tokenPrice: 8 }), "8 token · kişi başı");
  });

  it("formats join CTA labels", () => {
    assert.equal(formatEventJoinCtaLabel(0, "idle"), "Katıl");
    assert.equal(formatEventJoinCtaLabel(10, "idle"), "10 token ile katıl");
    assert.equal(formatEventJoinCtaLabel(10, "approved"), "Ayrıl");
    assert.equal(formatEventJoinCtaLabel(10, "pending"), "İptal Et");
  });

  it("blocks join attempts when ticket is unavailable", () => {
    const legacyEvent = { tokenPrice: 0, metadata: { isPaid: true } };
    assert.equal(canAttemptEventJoin(legacyEvent, "idle"), false);
    assert.equal(canAttemptEventJoin(legacyEvent, "approved"), true);
    assert.equal(canAttemptEventJoin({ tokenPrice: 0 }, "idle"), true);
    assert.equal(canAttemptEventJoin({ tokenPrice: 5, ticketAvailable: true }, "idle"), true);
  });

  it("validates token price input", () => {
    assert.equal(parseTokenPriceInput("25"), 25);
    assert.equal(parseTokenPriceInput("-1"), null);
    assert.equal(parseTokenPriceInput("1.5"), null);
    assert.equal(parseTokenPriceInput(""), null);
    assert.equal(parseTokenPriceInput("0"), null);
    assert.equal(parseTokenPriceInput(String(MAX_EVENT_TOKEN_PRICE)), MAX_EVENT_TOKEN_PRICE);
    assert.equal(parseTokenPriceInput(String(MAX_EVENT_TOKEN_PRICE + 1)), null);
  });

  it("builds create payload for free and token tiers", () => {
    assert.deepEqual(buildCreateEventTicketPayload("free", ""), { isPaid: false, tokenPrice: 0 });
    assert.deepEqual(buildCreateEventTicketPayload("token", "15"), { isPaid: true, tokenPrice: 15 });
    assert.equal(buildCreateEventTicketPayload("token", "abc"), null);
  });

  it("maps create tier from isPaid flag", () => {
    assert.equal(resolveCreateEventTicketTier(false), "free");
    assert.equal(resolveCreateEventTicketTier(true), "token");
  });

  it("detects token ticket events", () => {
    assert.equal(isTokenTicketEvent(0), false);
    assert.equal(isTokenTicketEvent(3), true);
  });

  it("prefers API ticketAvailable when provided", () => {
    assert.equal(resolveEventTicketAvailable({ ticketAvailable: false, tokenPrice: 10 }), false);
    assert.equal(resolveEventTicketAvailable({ ticketAvailable: true, tokenPrice: 0, metadata: { isPaid: true } }), true);
  });
});

describe("CreateEventInput pricing contract", () => {
  it("does not include fiat price fields", () => {
    assert.equal(assertNoFiatCreatePricing, true);
  });
});

describe("resolveEventAttendanceError", () => {
  it("preserves insufficient balance backend message", () => {
    assert.equal(resolveEventAttendanceError(new Error("Yetersiz token bakiyesi")), "Yetersiz token bakiyesi");
  });

  it("preserves legacy ticket unavailable backend message", () => {
    assert.equal(
      resolveEventAttendanceError(new Error(LEGACY_TICKET_UNAVAILABLE_MESSAGE)),
      LEGACY_TICKET_UNAVAILABLE_MESSAGE,
    );
  });

  it("returns Turkish fallback for unknown errors", () => {
    assert.equal(resolveEventAttendanceError("unexpected"), EVENT_ATTENDANCE_ERROR_FALLBACK);
    assert.equal(resolveEventAttendanceError(new Error("   ")), EVENT_ATTENDANCE_ERROR_FALLBACK);
  });
});
