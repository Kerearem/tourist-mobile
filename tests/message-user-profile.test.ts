import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildPublicUserProfileSeed,
  mergePublicUserProfileSeed,
} from "../src/features/profile/utils/publicUserProfileHelpers";

describe("message user profile consistency", () => {
  it("keeps ConversationInfo profile navigation inside MessagesStack", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/ConversationInfoScreen.tsx"),
      "utf8",
    );

    assert.match(source, /MessagesRoutes\.MessageUserProfileScreen/);
    assert.doesNotMatch(source, /TabRoutes\.ExploreTab/);
    assert.doesNotMatch(source, /ExploreRoutes/);
  });

  it("renders MessageUserProfileScreen with the canonical public profile view", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessageUserProfileScreen.tsx"),
      "utf8",
    );

    assert.match(source, /PublicUserProfileView/);
    assert.match(source, /navigation\.goBack\(\)/);
    assert.doesNotMatch(source, /TabRoutes\.ExploreTab/);
    assert.doesNotMatch(source, /getSnapsByUser/);
    assert.doesNotMatch(source, /getOrganizerReels/);
    assert.doesNotMatch(source, /getOrganizerPublicEvents/);
  });

  it("uses the same public profile renderer in Explore search profile flow", () => {
    const exploreSource = readFileSync(
      join(process.cwd(), "src/features/explore/screens/ExploreFeedScreen.tsx"),
      "utf8",
    );

    assert.match(exploreSource, /PublicUserProfileView/);
    assert.doesNotMatch(exploreSource, /ProfileContentTabs/);
  });

  it("merges canonical public profile API data onto route seed params", () => {
    const seed = buildPublicUserProfileSeed({
      id: "user-1",
      username: "ada",
      displayName: "Ada",
      isOrganizer: false,
    });

    const merged = mergePublicUserProfileSeed(seed, {
      id: "user-1",
      username: "ada_lovelace",
      displayName: "Ada Lovelace",
      bio: "Builder",
      city: "Istanbul",
      countryCode: "TR",
      accountType: "personal",
      isOrganizer: true,
      verificationBadge: "organizer",
    });

    assert.equal(merged.displayName, "Ada Lovelace");
    assert.equal(merged.username, "ada_lovelace");
    assert.equal(merged.bio, "Builder");
    assert.equal(merged.isOrganizer, true);
  });
});
