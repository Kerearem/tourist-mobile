import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { EventItem } from "../src/features/events/types";
import {
  resolveOrganizerCreatedEventPressTarget,
  shouldUsePublicEventDetailForOrganizerEvent,
  toOrganizerEventSubmissionSnapshot,
} from "../src/features/events/utils/organizerCreatedEventNavigation";

function buildEvent(status: string): EventItem {
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
    capacity: 40,
    minAge: 18,
    hasAlcohol: true,
    smokingAllowed: false,
    tokenPrice: 12,
    ticketAvailable: true,
    metadata: { status },
  };
}

describe("organizer created event navigation", () => {
  it("routes pending events to submission detail instead of public detail", () => {
    const event = buildEvent("PENDING_REVIEW");
    assert.equal(shouldUsePublicEventDetailForOrganizerEvent(event), false);
    const target = resolveOrganizerCreatedEventPressTarget(event);
    assert.equal(target.kind, "submission-detail");
    if (target.kind === "submission-detail") {
      assert.equal(target.event.title, "Test Event");
      assert.equal(target.event.status, "PENDING_REVIEW");
    }
  });

  it("routes approved events to public detail", () => {
    const event = buildEvent("APPROVED");
    assert.equal(shouldUsePublicEventDetailForOrganizerEvent(event), true);
    assert.deepEqual(resolveOrganizerCreatedEventPressTarget(event), {
      kind: "public-detail",
      eventId: "evt-1",
    });
  });

  it("preserves submitted fields in submission snapshot", () => {
    const snapshot = toOrganizerEventSubmissionSnapshot(buildEvent("PENDING_REVIEW"));
    assert.equal(snapshot.capacity, 40);
    assert.equal(snapshot.minAge, 18);
    assert.equal(snapshot.hasAlcohol, true);
    assert.equal(snapshot.tokenPrice, 12);
  });
});
