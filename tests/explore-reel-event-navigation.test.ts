import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveExploreReelEventNavigationTarget,
  shouldShowExploreReelEventTag,
} from "../src/features/explore/utils/exploreReelEventNavigation";

describe("resolveExploreReelEventNavigationTarget", () => {
  it("routes APPROVED events to detail", () => {
    assert.equal(resolveExploreReelEventNavigationTarget("APPROVED"), "detail");
  });

  it("routes COMPLETED events to album", () => {
    assert.equal(resolveExploreReelEventNavigationTarget("COMPLETED"), "album");
  });

  it("returns null for unsupported statuses", () => {
    assert.equal(resolveExploreReelEventNavigationTarget("PENDING_REVIEW"), null);
    assert.equal(resolveExploreReelEventNavigationTarget("CANCELLED"), null);
    assert.equal(resolveExploreReelEventNavigationTarget("unknown"), null);
  });
});

describe("shouldShowExploreReelEventTag", () => {
  it("shows the tag for APPROVED events", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "APPROVED" }, false),
      true,
    );
  });

  it("shows the tag for COMPLETED events", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "COMPLETED" }, false),
      true,
    );
  });

  it("hides the tag for PENDING_REVIEW events", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "PENDING_REVIEW" }, false),
      false,
    );
  });

  it("hides the tag for CANCELLED events", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "CANCELLED" }, false),
      false,
    );
  });

  it("hides the tag for unknown statuses", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "unknown" }, false),
      false,
    );
  });

  it("hides the tag when the reel has no event", () => {
    assert.equal(shouldShowExploreReelEventTag(true, undefined, false), false);
  });

  it("hides the tag for non-reel posts", () => {
    assert.equal(
      shouldShowExploreReelEventTag(false, { id: "event-1", status: "APPROVED" }, false),
      false,
    );
  });

  it("hides the tag when the post is reported hidden", () => {
    assert.equal(
      shouldShowExploreReelEventTag(true, { id: "event-1", status: "APPROVED" }, true),
      false,
    );
  });
});
