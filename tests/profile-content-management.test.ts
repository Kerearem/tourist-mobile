import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  PROFILE_PIN_LIMIT_MESSAGE_TR,
  applyProfileContentPinState,
  getOwnContentManagementCapabilities,
  sortProfileContentItems,
} from "../src/features/profile/utils/profileContentManagement";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("profileContentManagement utils", () => {
  it("sorts pinned profile content before regular items", () => {
    const sorted = sortProfileContentItems([
      { id: "c", createdAt: "2026-01-05T00:00:00.000Z" },
      { id: "b", createdAt: "2026-01-01T00:00:00.000Z", isPinned: true, pinnedAt: "2026-01-02T00:00:00.000Z" },
      { id: "a", createdAt: "2026-01-01T00:00:00.000Z", isPinned: true, pinnedAt: "2026-01-03T00:00:00.000Z" },
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ["a", "b", "c"],
    );
  });

  it("hides pin action for moments in event album context", () => {
    assert.deepEqual(getOwnContentManagementCapabilities("MOMENT", "event-album"), {
      canEdit: true,
      canDelete: true,
      canPin: false,
    });
  });

  it("hides pin action for moments in profile context", () => {
    assert.equal(getOwnContentManagementCapabilities("MOMENT", "profile").canPin, false);
  });

  it("allows pin for snaps on profile", () => {
    assert.equal(getOwnContentManagementCapabilities("SNAP", "profile").canPin, true);
  });

  it("applies and clears pin state", () => {
    assert.deepEqual(applyProfileContentPinState({ isPinned: true, pinnedAt: "x" }, false), {
      isPinned: false,
      pinnedAt: undefined,
    });
  });

  it("uses the Turkish max pin message", () => {
    assert.equal(PROFILE_PIN_LIMIT_MESSAGE_TR, "En fazla 3 gönderi sabitleyebilirsin.");
  });
});

describe("own profile management UI source guards", () => {
  it("uses shared management sheet instead of inline reel trash", () => {
    const source = readFileSync(
      join(__dirname, "../src/features/profile/components/ProfileReelsFeedViewer.tsx"),
      "utf8",
    );

    assert.doesNotMatch(source, /trash-outline/);
    assert.match(source, /useOwnContentManagement/);
    assert.match(source, /ellipsis-horizontal/);
  });

  it("shows snap management only for own profile", () => {
    const source = readFileSync(
      join(__dirname, "../src/features/snaps/components/ProfileSnapFeedViewer.tsx"),
      "utf8",
    );

    assert.match(source, /isOwnProfile && activeSnap/);
    assert.match(source, /useOwnContentManagement/);
  });

  it("shows moment management only for own moments", () => {
    const source = readFileSync(
      join(__dirname, "../src/features/events/components/EventMomentFeedViewer.tsx"),
      "utf8",
    );

    assert.match(source, /isOwnActiveMoment/);
    assert.doesNotMatch(source, /isOwnProfile/);
  });
});

describe("Explore more menu remains report-only", () => {
  it("does not add owner management actions to ExplorePostMoreSheet", () => {
    const source = readFileSync(
      join(__dirname, "../src/features/explore/components/ExplorePostMoreSheet.tsx"),
      "utf8",
    );

    assert.match(source, /İçeriği şikâyet et/);
    assert.doesNotMatch(source, /Gönderiyi düzenle/);
    assert.doesNotMatch(source, /Sabitle/);
  });
});
