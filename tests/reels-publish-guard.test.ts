import test from "node:test";
import assert from "node:assert/strict";

import type { EventItem } from "../src/features/events/types";
import { canPublishReelForEvent, getReelsWindow } from "../src/features/profile/services/reelsPublishing";

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem => ({
  id: "event_test",
  title: "Test Event",
  description: "Test event description",
  host: { id: "host_1", displayName: "Host" },
  type: "social",
  visibility: "city",
  city: "Berlin",
  countryCode: "DE",
  timezone: "Europe/Berlin",
  startsAt: "2026-06-10T12:00:00.000Z",
  endsAt: "2026-06-10T14:00:00.000Z",
  attendeeCount: 10,
  attendanceStatus: "approved",
  ...overrides,
});

test("blocks reels publish when event is missing", () => {
  const result = canPublishReelForEvent(null, new Date("2026-06-10T12:30:00.000Z"));
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "missing_event");
  }
});

test("blocks reels publish when attendance is not approved", () => {
  const result = canPublishReelForEvent(buildEvent({ attendanceStatus: "pending" }), new Date("2026-06-10T12:30:00.000Z"));
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "not_approved");
  }
});

test("allows reels publish exactly at start-minus-1h boundary", () => {
  const event = buildEvent();
  const window = getReelsWindow(event);
  assert.ok(window);
  const result = canPublishReelForEvent(event, window!.start);
  assert.equal(result.allowed, true);
});

test("allows reels publish exactly at end-plus-1h boundary", () => {
  const event = buildEvent();
  const window = getReelsWindow(event);
  assert.ok(window);
  const result = canPublishReelForEvent(event, window!.end);
  assert.equal(result.allowed, true);
});

test("blocks reels publish before window opens", () => {
  const event = buildEvent();
  const window = getReelsWindow(event);
  assert.ok(window);
  const result = canPublishReelForEvent(event, new Date(window!.start.getTime() - 1));
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "too_early");
  }
});

test("blocks reels publish after window closes", () => {
  const event = buildEvent();
  const window = getReelsWindow(event);
  assert.ok(window);
  const result = canPublishReelForEvent(event, new Date(window!.end.getTime() + 1));
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "too_late");
  }
});
