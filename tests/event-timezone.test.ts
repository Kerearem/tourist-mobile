import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTimezoneOptions,
  collectWallClockUtcCandidates,
  EVENT_DST_AMBIGUOUS_WALL_CLOCK_MESSAGE,
  EVENT_DST_INVALID_WALL_CLOCK_MESSAGE,
  EVENT_TIMEZONE_INVALID_MESSAGE,
  formatEventDateTimeRange,
  formatEventInstant,
  formatUtcIsoInTimezone,
  isValidIanaTimezone,
  normalizeIanaTimezone,
  resolveIntlDeviceTimezone,
  resolveWallClockValidationError,
  searchTimezoneOptions,
  wallClockFromDate,
  wallClockToUtc,
} from "../src/features/events/utils/eventTimezone";
import { buildCreateEventPayload } from "../src/features/events/utils/eventCreationPayload";
import { createInitialEventCreationDraft } from "../src/features/events/utils/eventCreationDraft";
import { validateEventCreationStep } from "../src/features/events/utils/eventCreationValidation";

function buildBerlinDraftAt1800() {
  const draft = createInitialEventCreationDraft({ city: "Berlin", countryCode: "DE" });
  draft.title = "Berlin Akşam Buluşması";
  draft.description = "Berlin saat diliminde akşam etkinliği testi.";
  draft.eventType = "social";
  draft.timezone = "Europe/Berlin";
  draft.startsAt = new Date(2026, 6, 20, 18, 0, 0, 0);
  draft.endsAt = new Date(2026, 6, 20, 20, 0, 0, 0);
  draft.venueName = "Kreuzberg Merkez";
  draft.capacityInput = "30";
  return draft;
}

describe("event timezone helpers", () => {
  it("falls back to Intl device timezone when available", () => {
    const timezone = resolveIntlDeviceTimezone();
    if (timezone) {
      assert.equal(isValidIanaTimezone(timezone), true);
    }
  });

  it("validates canonical IANA timezones", () => {
    assert.equal(isValidIanaTimezone("Europe/Berlin"), true);
    assert.equal(isValidIanaTimezone("Europe/Istanbul"), true);
    assert.equal(isValidIanaTimezone("Not/A_Timezone"), false);
    assert.equal(normalizeIanaTimezone(" Europe/Berlin "), "Europe/Berlin");
    assert.equal(normalizeIanaTimezone("Invalid/Zone"), null);
  });

  it("canonicalizes alias timezones when runtime supports them", () => {
    if (!isValidIanaTimezone("US/Eastern")) {
      return;
    }

    assert.equal(normalizeIanaTimezone("US/Eastern"), "America/New_York");
    assert.equal(normalizeIanaTimezone(" US/Eastern "), "America/New_York");
  });

  it("resolves wall-clock UTC candidates without minute scanning", () => {
    const berlinWall = { year: 2026, month: 7, day: 20, hour: 18, minute: 0 };
    assert.equal(collectWallClockUtcCandidates(berlinWall, "Europe/Berlin").length, 1);

    const nonexistentWall = { year: 2026, month: 3, day: 8, hour: 2, minute: 30 };
    assert.equal(collectWallClockUtcCandidates(nonexistentWall, "America/New_York").length, 0);

    const ambiguousWall = { year: 2026, month: 11, day: 1, hour: 1, minute: 30 };
    assert.equal(collectWallClockUtcCandidates(ambiguousWall, "America/New_York").length, 2);

    const source = wallClockToUtc.toString();
    assert.equal(source.includes("plus({ minutes: 1 })"), false);
    assert.equal(source.includes("utcCandidates"), false);
    assert.equal(source.includes("windowStart"), false);
  });

  it("searches timezone options by city or IANA name", () => {
    const options = buildTimezoneOptions();
    assert.ok(options.length > 300);
    const berlinMatches = searchTimezoneOptions(options, "berlin");
    assert.ok(berlinMatches.some((item) => item.value === "Europe/Berlin"));
    const newYorkMatches = searchTimezoneOptions(options, "new york");
    assert.ok(newYorkMatches.some((item) => item.value === "America/New_York"));
  });

  it("converts Berlin summer wall-clock 18:00 to correct UTC", () => {
    const result = wallClockToUtc(
      { year: 2026, month: 7, day: 20, hour: 18, minute: 0 },
      "Europe/Berlin",
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.iso, "2026-07-20T16:00:00.000Z");
    }
  });

  it("converts Berlin winter wall-clock 18:00 to correct UTC", () => {
    const result = wallClockToUtc(
      { year: 2026, month: 1, day: 20, hour: 18, minute: 0 },
      "Europe/Berlin",
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.iso, "2026-01-20T17:00:00.000Z");
    }
  });

  it("converts New York DST wall-clock to correct UTC", () => {
    const result = wallClockToUtc(
      { year: 2026, month: 7, day: 20, hour: 18, minute: 0 },
      "America/New_York",
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.iso, "2026-07-20T22:00:00.000Z");
    }
  });

  it("keeps wall-clock hour when timezone changes but UTC instant changes", () => {
    const wall = { year: 2026, month: 7, day: 20, hour: 18, minute: 0 };
    const berlin = wallClockToUtc(wall, "Europe/Berlin");
    const istanbul = wallClockToUtc(wall, "Europe/Istanbul");
    assert.equal(berlin.ok, true);
    assert.equal(istanbul.ok, true);
    if (berlin.ok && istanbul.ok) {
      assert.notEqual(berlin.iso, istanbul.iso);
    }
  });

  it("rejects nonexistent local times during DST spring forward", () => {
    const result = wallClockToUtc(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      "America/New_York",
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "invalid");
    }
    assert.equal(
      resolveWallClockValidationError(
        { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
        "America/New_York",
      ),
      EVENT_DST_INVALID_WALL_CLOCK_MESSAGE,
    );
  });

  it("rejects ambiguous local times during DST fall back", () => {
    const result = wallClockToUtc(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      "America/New_York",
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "ambiguous");
    }
    assert.equal(
      resolveWallClockValidationError(
        { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
        "America/New_York",
      ),
      EVENT_DST_AMBIGUOUS_WALL_CLOCK_MESSAGE,
    );
  });

  it("formats event instants in event timezone with fallback for legacy records", () => {
    const berlinLabel = formatEventInstant("2026-07-20T16:00:00.000Z", "Europe/Berlin", "en-GB");
    assert.match(berlinLabel, /20/);
    assert.match(berlinLabel, /18:00|6:00/);

    const fallbackLabel = formatEventInstant("2026-07-20T16:00:00.000Z", "Invalid/Zone", "en-GB");
    assert.match(fallbackLabel, /20/);
  });

  it("formats event date ranges in event timezone", () => {
    const label = formatEventDateTimeRange(
      "2026-07-20T16:00:00.000Z",
      "2026-07-20T18:00:00.000Z",
      "Europe/Berlin",
      "en-GB",
    );
    assert.match(label, /18:00|6:00/);
    assert.match(label, /20:00|8:00/);
  });

  it("builds payload with timezone and UTC instants from wall-clock draft", () => {
    const draft = buildBerlinDraftAt1800();
    const result = buildCreateEventPayload(draft, 30);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.timezone, "Europe/Berlin");
      assert.equal(result.payload.startsAt, "2026-07-20T16:00:00.000Z");
      assert.equal(result.payload.endsAt, "2026-07-20T18:00:00.000Z");
    }
  });

  it("rejects step 2 when timezone is missing", () => {
    const draft = buildBerlinDraftAt1800();
    draft.timezone = "";
    const errors = validateEventCreationStep(2, draft, {
      now: new Date("2026-07-01T12:00:00.000Z"),
      organizerAge: 25,
    });
    assert.equal(errors.timezone, EVENT_TIMEZONE_INVALID_MESSAGE);
  });

  it("preserves picker wall-clock components independent of Date container", () => {
    const date = new Date(2026, 6, 20, 18, 0, 0, 0);
    const wall = wallClockFromDate(date);
    assert.deepEqual(wall, { year: 2026, month: 7, day: 20, hour: 18, minute: 0 });
  });

  it("formats UTC instant back to Berlin wall-clock label", () => {
    const label = formatUtcIsoInTimezone("2026-07-20T16:00:00.000Z", "Europe/Berlin", "en-GB");
    assert.match(label, /18:00|6:00/);
  });
});
