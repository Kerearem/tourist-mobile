import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  pressReelEventNavigationTarget,
  resolveReelEventNavigationTarget,
  shouldShowReelEventTag,
} from "../src/features/events/utils/reelEventNavigation";
import {
  resolveExploreReelEventNavigationTarget,
  shouldShowExploreReelEventTag,
} from "../src/features/explore/utils/exploreReelEventNavigation";

const __dirname = dirname(fileURLToPath(import.meta.url));
const profileReelsFeedViewerSource = readFileSync(
  join(__dirname, "../src/features/profile/components/ProfileReelsFeedViewer.tsx"),
  "utf8",
);

describe("resolveReelEventNavigationTarget", () => {
  it("routes APPROVED events to detail", () => {
    assert.equal(resolveReelEventNavigationTarget("APPROVED"), "detail");
  });

  it("routes COMPLETED events to album", () => {
    assert.equal(resolveReelEventNavigationTarget("COMPLETED"), "album");
  });

  it("returns null for unsupported statuses", () => {
    assert.equal(resolveReelEventNavigationTarget("PENDING_REVIEW"), null);
    assert.equal(resolveReelEventNavigationTarget("REJECTED"), null);
    assert.equal(resolveReelEventNavigationTarget("CANCELLED"), null);
    assert.equal(resolveReelEventNavigationTarget("unknown"), null);
  });

  it("returns null when status is missing", () => {
    assert.equal(resolveReelEventNavigationTarget(undefined), null);
    assert.equal(resolveReelEventNavigationTarget(null), null);
    assert.equal(resolveReelEventNavigationTarget(""), null);
  });
});

describe("shouldShowReelEventTag", () => {
  it("shows the tag for APPROVED events", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "APPROVED" }, false), true);
  });

  it("shows the tag for COMPLETED events", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "COMPLETED" }, false), true);
  });

  it("hides the tag for PENDING_REVIEW events", () => {
    assert.equal(
      shouldShowReelEventTag(true, { id: "event-1", status: "PENDING_REVIEW" }, false),
      false,
    );
  });

  it("hides the tag for REJECTED events", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "REJECTED" }, false), false);
  });

  it("hides the tag for CANCELLED events", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "CANCELLED" }, false), false);
  });

  it("hides the tag for unknown statuses", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "unknown" }, false), false);
  });

  it("hides the tag when status is missing", () => {
    assert.equal(shouldShowReelEventTag(true, { id: "event-1", status: "" }, false), false);
  });

  it("hides the tag when the reel has no event", () => {
    assert.equal(shouldShowReelEventTag(true, undefined, false), false);
  });

  it("hides the tag when the post is reported hidden", () => {
    assert.equal(
      shouldShowReelEventTag(true, { id: "event-1", status: "APPROVED" }, true),
      false,
    );
  });
});

describe("pressReelEventNavigationTarget", () => {
  it("calls detail handler for APPROVED events", () => {
    let detailId: string | null = null;
    let albumId: string | null = null;

    pressReelEventNavigationTarget(
      { id: "event-approved", status: "APPROVED" },
      {
        onDetail: (eventId) => {
          detailId = eventId;
        },
        onAlbum: (eventId) => {
          albumId = eventId;
        },
      },
    );

    assert.equal(detailId, "event-approved");
    assert.equal(albumId, null);
  });

  it("calls album handler for COMPLETED events", () => {
    let detailId: string | null = null;
    let albumId: string | null = null;

    pressReelEventNavigationTarget(
      { id: "event-completed", status: "COMPLETED" },
      {
        onDetail: (eventId) => {
          detailId = eventId;
        },
        onAlbum: (eventId) => {
          albumId = eventId;
        },
      },
    );

    assert.equal(detailId, null);
    assert.equal(albumId, "event-completed");
  });

  it("does not call handlers for REJECTED events", () => {
    let called = false;

    pressReelEventNavigationTarget(
      { id: "event-rejected", status: "REJECTED" },
      {
        onDetail: () => {
          called = true;
        },
        onAlbum: () => {
          called = true;
        },
      },
    );

    assert.equal(called, false);
  });
});

describe("explore reel event navigation re-exports", () => {
  it("keeps explore helpers aligned with shared reel navigation", () => {
    assert.equal(resolveExploreReelEventNavigationTarget("APPROVED"), "detail");
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "REJECTED" }, false),
      false,
    );
  });
});

describe("ProfileReelsFeedViewer source guard", () => {
  it("does not navigate using raw reel.event id without status guard", () => {
    assert.doesNotMatch(profileReelsFeedViewerSource, /onEventPress\?\.\(reel\.event!\.id\)/);
    assert.match(profileReelsFeedViewerSource, /shouldShowReelEventTag/);
    assert.match(profileReelsFeedViewerSource, /pressReelEventNavigationTarget/);
  });
});
