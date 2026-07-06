import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getExplorePostPlaybackKey,
  shouldExploreReelPlaybackActive,
  type ExploreReelPlaybackContext,
} from "../src/features/explore/utils/exploreReelPlayback";

const baseContext = (overrides: Partial<ExploreReelPlaybackContext> = {}): ExploreReelPlaybackContext => ({
  isScreenFocused: true,
  isAppActive: true,
  activeVisiblePostKey: "reel:reel-1",
  postKey: "reel:reel-1",
  isSearchOpen: false,
  isSearchProfileOpen: false,
  isCommentsOpen: false,
  isShareOpen: false,
  isContentReportOpen: false,
  isProfileMenuOpen: false,
  isProfileReportOpen: false,
  ...overrides,
});

describe("getExplorePostPlaybackKey", () => {
  it("builds a stable post key from type and id", () => {
    assert.equal(getExplorePostPlaybackKey({ type: "reel", id: "abc" }), "reel:abc");
  });
});

describe("shouldExploreReelPlaybackActive", () => {
  it("allows playback when screen is focused, app is active, reel is visible, and no overlay is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext()), true);
  });

  it("blocks playback when screen is unfocused", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isScreenFocused: false })), false);
  });

  it("blocks playback when app is inactive or backgrounded", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isAppActive: false })), false);
  });

  it("blocks playback when reel is not the visible post", () => {
    assert.equal(
      shouldExploreReelPlaybackActive(
        baseContext({
          activeVisiblePostKey: "reel:other",
          postKey: "reel:reel-1",
        }),
      ),
      false,
    );
  });

  it("blocks playback when search is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isSearchOpen: true })), false);
  });

  it("blocks playback when comments are open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isCommentsOpen: true })), false);
  });

  it("blocks playback when share sheet is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isShareOpen: true })), false);
  });

  it("blocks playback when content report sheet is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isContentReportOpen: true })), false);
  });

  it("blocks playback when search profile overlay is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isSearchProfileOpen: true })), false);
  });

  it("blocks playback when profile menu or profile report overlay is open", () => {
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isProfileMenuOpen: true })), false);
    assert.equal(shouldExploreReelPlaybackActive(baseContext({ isProfileReportOpen: true })), false);
  });
});
