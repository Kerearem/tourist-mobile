import test from "node:test";
import assert from "node:assert/strict";

import { canPublishOrganizerReel } from "../src/features/profile/services/reelsPublishing";

test("allows approved organizers to publish reels", () => {
  const result = canPublishOrganizerReel({ organizerStatus: "approved" });
  assert.equal(result.allowed, true);
});

test("blocks non-organizers from publishing reels", () => {
  const result = canPublishOrganizerReel({ organizerStatus: "pending" });
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "not_organizer");
  }
});

test("blocks banned users from publishing reels", () => {
  const result = canPublishOrganizerReel({ organizerStatus: "approved", isBanned: true });
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "banned");
  }
});

test("blocks users without organizer status", () => {
  const result = canPublishOrganizerReel({});
  assert.equal(result.allowed, false);
  if (!result.allowed) {
    assert.equal(result.reason, "not_organizer");
  }
});
