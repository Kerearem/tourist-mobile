import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

import { formatEventCardAttendance, formatEventCardRating } from "../src/features/events/utils/eventCardPresentation";
import type { EventItem } from "../src/features/events/types";

const baseEvent: EventItem = {
  id: "event-1",
  title: "Berlin Walk",
  description: "A city walk",
  host: { id: "host-1", displayName: "Ada" },
  type: "outdoor",
  visibility: "city",
  city: "Berlin",
  countryCode: "DE",
  startsAt: "2099-12-01T18:00:00.000Z",
  attendeeCount: 0,
  tokenPrice: 0,
  ticketAvailable: true,
};

describe("event card presentation", () => {
  it("uses real rating values and hides empty ratings", () => {
    assert.equal(formatEventCardRating(baseEvent), null);
    assert.equal(formatEventCardRating({ ...baseEvent, averageRating: 4.75, ratingCount: 12 }), "4.8");
  });

  it("formats attendance honestly without fake avatar initials", () => {
    assert.equal(formatEventCardAttendance({ attendeeCount: 0 }), "İlk katılımcı sen ol");
    assert.equal(formatEventCardAttendance({ attendeeCount: 4 }), "4 katılımcı");
    assert.equal(formatEventCardAttendance({ attendeeCount: 4, capacity: 20 }), "4 / 20 katılımcı");
  });

  it("never nudges the organizer to join their own empty event", () => {
    assert.equal(
      formatEventCardAttendance({ attendeeCount: 0 }, { isOwnEvent: true }),
      "Henüz katılımcı yok",
    );
    assert.equal(
      formatEventCardAttendance({ attendeeCount: 0 }, { isOwnEvent: false }),
      "İlk katılımcı sen ol",
    );
    assert.equal(
      formatEventCardAttendance({ attendeeCount: 4, capacity: 20 }, { isOwnEvent: true }),
      "4 / 20 katılımcı",
    );
  });

  it("passes viewer identity from the event card to the attendance label", () => {
    const source = readFileSync("src/features/events/components/EventCard.tsx", "utf8");
    assert.equal(source.includes("viewerUserId"), true);
    assert.equal(source.includes("isOwnEvent"), true);
  });

  it("does not render hardcoded fake rating or attendee placeholders", () => {
    const source = readFileSync("src/features/events/components/EventCard.tsx", "utf8");
    assert.equal(source.includes('const ratingLabel = (_event: EventItem) => "4.8"'), false);
    assert.equal(source.includes('"U1"'), false);
    assert.equal(source.includes('"U2"'), false);
    assert.equal(source.includes('"U3"'), false);
  });
});
