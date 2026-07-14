import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createEventScreenOptions } from "../src/navigation/createEventScreenOptions";
import {
  EDGE_SWIPE_BACK_DISTANCE_THRESHOLD,
  EDGE_SWIPE_BACK_EDGE_WIDTH,
  shouldClaimEdgeSwipeBack,
  shouldCompleteEdgeSwipeBack,
} from "../src/utils/edgeSwipeBack";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("edge swipe-back gesture math", () => {
  it("claims rightward horizontal drags starting at the left edge", () => {
    assert.equal(
      shouldClaimEdgeSwipeBack({ startX: EDGE_SWIPE_BACK_EDGE_WIDTH - 4, dx: 14, dy: 2 }),
      true,
    );
  });

  it("does not claim drags starting away from the edge", () => {
    assert.equal(
      shouldClaimEdgeSwipeBack({ startX: EDGE_SWIPE_BACK_EDGE_WIDTH + 40, dx: 30, dy: 0 }),
      false,
    );
  });

  it("does not claim leftward or vertical drags", () => {
    assert.equal(shouldClaimEdgeSwipeBack({ startX: 4, dx: -20, dy: 0 }), false);
    assert.equal(shouldClaimEdgeSwipeBack({ startX: 4, dx: 12, dy: 40 }), false);
  });

  it("completes the swipe past the distance threshold", () => {
    assert.equal(
      shouldCompleteEdgeSwipeBack({ dx: EDGE_SWIPE_BACK_DISTANCE_THRESHOLD + 1, vx: 0 }),
      true,
    );
  });

  it("completes short but fast flicks", () => {
    assert.equal(shouldCompleteEdgeSwipeBack({ dx: 30, vx: 1.2 }), true);
  });

  it("does not complete short slow drags", () => {
    assert.equal(shouldCompleteEdgeSwipeBack({ dx: 20, vx: 0.05 }), false);
  });
});

describe("public profile swipe-back wiring", () => {
  it("wraps the Explore public profile overlay in EdgeSwipeBackView", () => {
    const source = readSource("src/features/explore/screens/ExploreFeedScreen.tsx");

    assert.match(source, /EdgeSwipeBackView/);
    assert.match(
      source,
      /<EdgeSwipeBackView onSwipeBack=\{\(\) => setSelectedSearchUser\(null\)\}>\s*<PublicUserProfileView/,
    );
  });

  it("EdgeSwipeBackView uses built-in PanResponder, no new gesture dependency", () => {
    const source = readSource("src/components/ui/EdgeSwipeBackView.tsx");

    assert.match(source, /PanResponder/);
    assert.doesNotMatch(source, /react-native-gesture-handler/);
    assert.doesNotMatch(source, /react-native-reanimated/);
  });

  it("enables native swipe-back for MessageUserProfileScreen in MessagesStack", () => {
    const source = readSource("src/navigation/messages/MessagesStack.tsx");
    const screenBlock = source.slice(source.indexOf("MessageUserProfileScreen"));

    assert.match(screenBlock, /gestureEnabled:\s*true/);
    assert.match(screenBlock, /fullScreenGestureEnabled:\s*true/);
  });

  it("keeps CreateEventScreen gestures disabled", () => {
    assert.equal(createEventScreenOptions.gestureEnabled, false);
    assert.equal(createEventScreenOptions.fullScreenGestureEnabled, false);

    for (const stackPath of [
      "src/navigation/profile/ProfileStack.tsx",
      "src/navigation/events/EventsStack.tsx",
    ]) {
      const source = readSource(stackPath);
      assert.match(source, /component=\{CreateEventScreen\}/);
      assert.match(source, /options=\{createEventScreenOptions\}/);
    }
  });
});
