import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createEventScreenOptions } from "../src/navigation/createEventScreenOptions";

describe("CreateEventScreen stack registration", () => {
  it("disables native swipe-back gestures via shared screen options", () => {
    assert.equal(createEventScreenOptions.gestureEnabled, false);
    assert.equal(createEventScreenOptions.fullScreenGestureEnabled, false);
  });

  it("registers disabled gestures for CreateEventScreen in ProfileStack", () => {
    const source = readFileSync(
      join(process.cwd(), "src/navigation/profile/ProfileStack.tsx"),
      "utf8",
    );

    assert.match(source, /CreateEventScreen/);
    assert.match(source, /createEventScreenOptions/);
    assert.match(source, /options=\{createEventScreenOptions\}/);
  });

  it("registers disabled gestures for CreateEventScreen in EventsStack", () => {
    const source = readFileSync(join(process.cwd(), "src/navigation/events/EventsStack.tsx"), "utf8");

    assert.match(source, /CreateEventScreen/);
    assert.match(source, /createEventScreenOptions/);
    assert.match(source, /options=\{createEventScreenOptions\}/);
  });
});
