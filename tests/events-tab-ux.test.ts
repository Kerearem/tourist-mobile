import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { EventItem } from "../src/features/events/types";
import {
  ATTENDED_EVENTS_FILTER_SEGMENTS,
  attendedEventStatusLabel,
  CREATED_EVENTS_FILTER_SEGMENTS,
  filterAttendedEvents,
  filterCreatedEvents,
  normalizeAttendedEventsFilter,
  normalizeCreatedEventsFilter,
  organizerManagedEventStatusLabel,
  resolveAttendedEventPressTarget,
  resolveAttendedEventsEmptyState,
  resolveCreatedEventsEmptyState,
  resolveCreatedEventPressTarget,
  resolveCreatedEventsFilterBucket,
  resolveFilteredEventsEmptyState,
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

describe("created events filters", () => {
  const now = new Date("2026-07-15T12:00:00.000Z").getTime();

  it("offers active, past and rejected segments with Turkish labels", () => {
    assert.deepEqual(
      CREATED_EVENTS_FILTER_SEGMENTS.map((segment) => segment.key),
      ["active", "past", "rejected"],
    );
    assert.deepEqual(
      CREATED_EVENTS_FILTER_SEGMENTS.map((segment) => segment.label),
      ["Aktif", "Geçmiş", "Reddedildi"],
    );
  });

  it("buckets created events by review status and end time", () => {
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("REJECTED"), now), "rejected");
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("COMPLETED"), now), "past");
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("CANCELLED"), now), "past");
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("PENDING_REVIEW"), now), "active");
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("DRAFT"), now), "active");
    assert.equal(
      resolveCreatedEventsFilterBucket(
        buildEvent("APPROVED", { startsAt: "2026-08-01T18:00:00.000Z", endsAt: "2026-08-01T20:00:00.000Z" }),
        now,
      ),
      "active",
    );
    assert.equal(
      resolveCreatedEventsFilterBucket(
        buildEvent("APPROVED", { startsAt: "2026-06-01T18:00:00.000Z", endsAt: "2026-06-01T20:00:00.000Z" }),
        now,
      ),
      "past",
    );
  });

  it("keeps unknown statuses visible under the active filter", () => {
    assert.equal(resolveCreatedEventsFilterBucket(buildEvent("SOMETHING_NEW"), now), "active");
  });

  it("filters created events into disjoint buckets", () => {
    const events = [
      buildEvent("APPROVED", { id: "future", startsAt: "2026-08-01T18:00:00.000Z", endsAt: "2026-08-01T20:00:00.000Z" }),
      buildEvent("APPROVED", { id: "ended", startsAt: "2026-06-01T18:00:00.000Z", endsAt: "2026-06-01T20:00:00.000Z" }),
      buildEvent("REJECTED", { id: "rejected" }),
    ];
    assert.deepEqual(filterCreatedEvents(events, "active", now).map((event) => event.id), ["future"]);
    assert.deepEqual(filterCreatedEvents(events, "past", now).map((event) => event.id), ["ended"]);
    assert.deepEqual(filterCreatedEvents(events, "rejected", now).map((event) => event.id), ["rejected"]);
  });

  it("normalizes unknown filter params to active", () => {
    assert.equal(normalizeCreatedEventsFilter(undefined), "active");
    assert.equal(normalizeCreatedEventsFilter("bogus"), "active");
    assert.equal(normalizeCreatedEventsFilter("rejected"), "rejected");
    assert.equal(normalizeCreatedEventsFilter("past"), "past");
  });
});

describe("attended events filters", () => {
  const now = new Date("2026-07-15T12:00:00.000Z").getTime();

  it("offers upcoming and past segments with Turkish labels", () => {
    assert.deepEqual(
      ATTENDED_EVENTS_FILTER_SEGMENTS.map((segment) => segment.key),
      ["upcoming", "past"],
    );
    assert.deepEqual(
      ATTENDED_EVENTS_FILTER_SEGMENTS.map((segment) => segment.label),
      ["Yaklaşan", "Geçmiş"],
    );
  });

  it("splits attended events by end time", () => {
    const events = [
      buildEvent("APPROVED", { id: "future", startsAt: "2026-08-01T18:00:00.000Z", endsAt: "2026-08-01T20:00:00.000Z" }),
      buildEvent("APPROVED", { id: "ended", startsAt: "2026-06-01T18:00:00.000Z", endsAt: "2026-06-01T20:00:00.000Z" }),
    ];
    assert.deepEqual(filterAttendedEvents(events, "upcoming", now).map((event) => event.id), ["future"]);
    assert.deepEqual(filterAttendedEvents(events, "past", now).map((event) => event.id), ["ended"]);
  });

  it("normalizes unknown filter params to upcoming", () => {
    assert.equal(normalizeAttendedEventsFilter(undefined), "upcoming");
    assert.equal(normalizeAttendedEventsFilter("bogus"), "upcoming");
    assert.equal(normalizeAttendedEventsFilter("past"), "past");
  });
});

describe("events tab shell", () => {
  it("keeps the bottom-nav events screen discover-only", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const source = readFileSync("src/features/events/screens/EventsListScreen.tsx", "utf8");
    assert.equal(source.includes("EventsTabSegmentControl"), false);
    assert.equal(source.includes("PersonalEventsList"), false);
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

  it("describes filter-specific empty states", () => {
    assert.match(resolveFilteredEventsEmptyState("created", "rejected").title, /Reddedilen/);
    assert.match(resolveFilteredEventsEmptyState("created", "past").title, /Geçmiş/);
    assert.match(resolveFilteredEventsEmptyState("created", "active").title, /Aktif/);
    assert.match(resolveFilteredEventsEmptyState("attended", "upcoming").title, /Yaklaşan/);
    assert.match(resolveFilteredEventsEmptyState("attended", "past").title, /Geçmiş/);
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
