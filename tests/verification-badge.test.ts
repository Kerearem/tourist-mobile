import assert from "node:assert/strict";
import test from "node:test";

import { resolveVerificationBadge } from "../src/utils/verificationBadge";

test("resolveVerificationBadge returns null for non-organizers", () => {
  assert.equal(resolveVerificationBadge({ organizerStatus: "not_applied" }), null);
  assert.equal(resolveVerificationBadge({ isOrganizer: false }), null);
});

test("resolveVerificationBadge returns organizer for approved personal accounts", () => {
  assert.equal(
    resolveVerificationBadge({ organizerStatus: "approved", accountType: "personal" }),
    "organizer",
  );
  assert.equal(resolveVerificationBadge({ isOrganizer: true, accountType: "personal" }), "organizer");
});

test("resolveVerificationBadge returns business for approved business accounts", () => {
  assert.equal(
    resolveVerificationBadge({ organizerStatus: "approved", accountType: "business" }),
    "business",
  );
});

test("resolveVerificationBadge prefers explicit verificationBadge from API", () => {
  assert.equal(resolveVerificationBadge({ verificationBadge: "business", isOrganizer: false }), "business");
});
