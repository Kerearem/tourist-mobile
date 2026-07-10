import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("message composer dm attachment controls", () => {
  it("uses text-only mode in direct message threads", () => {
    const threadSource = readFileSync(
      join(process.cwd(), "src/features/messages/screens/MessageThreadScreen.tsx"),
      "utf8",
    );

    assert.match(threadSource, /<MessageComposer[^>]*textOnly/);
  });

  it("keeps live camera enabled for event group threads", () => {
    const groupSource = readFileSync(
      join(process.cwd(), "src/features/messages/screens/GroupDetailScreen.tsx"),
      "utf8",
    );

    assert.match(groupSource, /showLiveCameraButton/);
    assert.match(groupSource, /textOnly/);
  });

  it("hides inactive gallery and mic controls when textOnly is enabled", () => {
    const composerSource = readFileSync(
      join(process.cwd(), "src/features/messages/components/MessageComposer.tsx"),
      "utf8",
    );

    assert.match(composerSource, /textOnly/);
    assert.match(composerSource, /showLiveCameraButton/);
    assert.match(composerSource, /!textOnly && !showLiveCameraButton/);
    assert.match(composerSource, /image-outline/);
    assert.match(composerSource, /mic-outline/);
  });
});
