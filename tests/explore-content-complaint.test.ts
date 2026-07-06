import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveExplorePostComplaintTargetType,
  shouldShowExplorePostMoreAction,
  isExplorePostReportedHidden,
  markExplorePostReported,
  shouldShowExplorePostInteractions,
} from "../src/features/explore/utils/exploreContentComplaint";
import { getExplorePostPlaybackKey } from "../src/features/explore/utils/exploreReelPlayback";
import {
  shouldExploreReelPlaybackActive,
  type ExploreReelPlaybackContext,
} from "../src/features/explore/utils/exploreReelPlayback";

describe("resolveExplorePostComplaintTargetType", () => {
  it("maps snap posts to SNAP", () => {
    assert.equal(resolveExplorePostComplaintTargetType("snap"), "SNAP");
  });

  it("maps reel posts to REEL", () => {
    assert.equal(resolveExplorePostComplaintTargetType("reel"), "REEL");
  });
});

describe("shouldShowExplorePostMoreAction", () => {
  it("shows the action for other users content", () => {
    assert.equal(shouldShowExplorePostMoreAction("viewer-1", "author-2"), true);
  });

  it("hides the action for the viewer's own content", () => {
    assert.equal(shouldShowExplorePostMoreAction("viewer-1", "viewer-1"), false);
  });

  it("hides the action when viewer id is missing", () => {
    assert.equal(shouldShowExplorePostMoreAction(undefined, "author-2"), false);
  });

  it("hides the action when the post is reported hidden", () => {
    assert.equal(shouldShowExplorePostMoreAction("viewer-1", "author-2", true), false);
  });
});

describe("reported explore post session state", () => {
  it("adds snap and reel keys independently", () => {
    let reportedKeys = new Set<string>();
    reportedKeys = markExplorePostReported(reportedKeys, { type: "snap", id: "snap-1" });
    reportedKeys = markExplorePostReported(reportedKeys, { type: "reel", id: "snap-1" });

    assert.equal(isExplorePostReportedHidden(reportedKeys, { type: "snap", id: "snap-1" }), true);
    assert.equal(isExplorePostReportedHidden(reportedKeys, { type: "reel", id: "snap-1" }), true);
    assert.equal(isExplorePostReportedHidden(reportedKeys, { type: "snap", id: "other" }), false);
  });

  it("does not mark a post reported when mark helper is not called", () => {
    const reportedKeys = new Set<string>();
    assert.equal(isExplorePostReportedHidden(reportedKeys, { type: "reel", id: "reel-1" }), false);
  });

  it("hides post interactions when reported hidden", () => {
    assert.equal(shouldShowExplorePostInteractions(true), false);
    assert.equal(shouldShowExplorePostInteractions(false), true);
  });

  it("uses type + id for reported keys", () => {
    const key = getExplorePostPlaybackKey({ type: "reel", id: "abc" });
    const reportedKeys = markExplorePostReported(new Set(), { type: "reel", id: "abc" });
    assert.equal(reportedKeys.has(key), true);
  });
});

describe("explore playback with complaint overlays", () => {
  const baseContext = (overrides: Partial<ExploreReelPlaybackContext> = {}): ExploreReelPlaybackContext => ({
    isScreenFocused: true,
    isAppActive: true,
    activeVisiblePostKey: "reel:reel-1",
    postKey: "reel:reel-1",
    isSearchOpen: false,
    isSearchProfileOpen: false,
    isCommentsOpen: false,
    isShareOpen: false,
    isMoreMenuOpen: false,
  isContentReportOpen: false,
  isPostReportedHidden: false,
  isProfileMenuOpen: false,
    isProfileReportOpen: false,
    ...overrides,
  });

  it("blocks playback when the Daha menu is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isMoreMenuOpen: true })), false);
  });

  it("blocks playback when the complaint reason sheet is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isContentReportOpen: true })), false);
  });
});
