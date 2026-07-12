import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { EventItem } from "../src/features/events/types";
import {
  attendedEventStatusLabel,
  EVENTS_TAB_SEGMENT_LABELS,
  normalizeEventsTabSection,
  organizerManagedEventStatusLabel,
  resolveAttendedEventPressTarget,
  resolveAttendedEventsEmptyState,
  resolveCreatedEventsEmptyState,
  resolveCreatedEventPressTarget,
  resolveEventsTabSegments,
  shouldShowOrganizerCreatedSection,
} from "../src/features/events/utils/eventsTabUx";
import { shouldUsePublicEventDetailForOrganizerEvent } from "../src/features/events/utils/organizerCreatedEventNavigation";

function buildEvent(status: string, overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "evt-1",
    title: "Test Event",
    description: "Description",
    host: { id: "host-1", displayName: "Host" },
    type: "social",
    visibility: "city",
    city: "İstanbul",
    countryCode: "TR",
    startsAt: "2026-08-01T18:00:00.000Z",
    endsAt: "2026-08-01T20:00:00.000Z",
    attendeeCount: 0,
    tokenPrice: 0,
    ticketAvailable: true,
    metadata: { status },
    ...overrides,
  };
}

describe("events tab visibility", () => {
  it("shows created segment only for approved organizers", () => {
    assert.equal(shouldShowOrganizerCreatedSection({ organizerStatus: "approved" }), true);
    assert.equal(shouldShowOrganizerCreatedSection({ organizerStatus: "pending" }), false);
    assert.equal(shouldShowOrganizerCreatedSection({ organizerStatus: "not_applied" }), false);
  });

  it("builds discover and attended segments for all users", () => {
    const segments = resolveEventsTabSegments({ organizerStatus: "not_applied" });
    assert.deepEqual(
      segments.map((segment) => segment.key),
      ["discover", "attended"],
    );
    assert.equal(segments[1]?.label, EVENTS_TAB_SEGMENT_LABELS.attended);
  });

  it("adds created segment for approved organizers", () => {
    const segments = resolveEventsTabSegments({ organizerStatus: "approved" });
    assert.deepEqual(
      segments.map((segment) => segment.key),
      ["discover", "attended", "created"],
    );
    assert.equal(segments[2]?.label, EVENTS_TAB_SEGMENT_LABELS.created);
  });

  it("falls back to discover when created section is unavailable", () => {
    assert.equal(
      normalizeEventsTabSection("created", { organizerStatus: "not_applied" }),
      "discover",
    );
  });
});

describe("events tab empty states", () => {
  it("uses attendee-focused attended empty copy", () => {
    const empty = resolveAttendedEventsEmptyState();
    assert.match(empty.title, /Katıldığın etkinlik yok/);
  });

  it("uses organizer-not-approved copy for pending users", () => {
    const empty = resolveCreatedEventsEmptyState({ organizerStatus: "pending" });
    assert.match(empty.title, /onay/i);
  });

  it("uses created-events empty copy for approved organizers", () => {
    const empty = resolveCreatedEventsEmptyState({ organizerStatus: "approved" });
    assert.match(empty.title, /Oluşturduğun etkinlik yok/);
  });
});

describe("events tab routing by status", () => {
  it("routes attended events to public detail", () => {
    const event = buildEvent("APPROVED", { attendanceStatus: "approved" });
    assert.deepEqual(resolveAttendedEventPressTarget(event), {
      kind: "public-detail",
      eventId: "evt-1",
    });
  });

  it("routes approved created events to public detail", () => {
    const event = buildEvent("APPROVED");
    assert.equal(shouldUsePublicEventDetailForOrganizerEvent(event), true);
    assert.equal(resolveCreatedEventPressTarget(event).kind, "public-detail");
  });

  it("routes pending and rejected created events to submission detail", () => {
    for (const status of ["PENDING_REVIEW", "REJECTED", "CANCELLED"] as const) {
      const event = buildEvent(status);
      assert.equal(shouldUsePublicEventDetailForOrganizerEvent(event), false);
      assert.equal(resolveCreatedEventPressTarget(event).kind, "submission-detail");
    }
  });

  it("labels managed statuses clearly", () => {
    assert.equal(organizerManagedEventStatusLabel(buildEvent("PENDING_REVIEW")), "İncelemede");
    assert.equal(organizerManagedEventStatusLabel(buildEvent("APPROVED")), "Yayında");
    assert.equal(organizerManagedEventStatusLabel(buildEvent("REJECTED")), "Reddedildi");
    assert.equal(organizerManagedEventStatusLabel(buildEvent("CANCELLED")), "İptal");
    assert.equal(organizerManagedEventStatusLabel(buildEvent("COMPLETED")), "Tamamlandı");
  });

  it("labels attended events without organizer management wording", () => {
    assert.equal(attendedEventStatusLabel(buildEvent("APPROVED", { attendanceStatus: "approved" })), "Katıldın");
    assert.equal(attendedEventStatusLabel(buildEvent("APPROVED", { attendanceStatus: "pending" })), "Onay Bekliyor");
  });
});
