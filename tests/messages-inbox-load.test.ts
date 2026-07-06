import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveInboxFocusLoadMode,
  shouldClearInboxOnLoadError,
  shouldSetInboxLoadingState,
  shouldSetInboxRefreshingState,
  shouldShowInboxFullScreenError,
  shouldShowInboxFullScreenLoader,
} from "../src/features/messages/utils/inboxLoadPresentation";

describe("resolveInboxFocusLoadMode", () => {
  it("uses initial load the first time inbox is focused", () => {
    assert.equal(resolveInboxFocusLoadMode(false), "initial");
  });

  it("uses silent refresh when inbox already has data", () => {
    assert.equal(resolveInboxFocusLoadMode(true), "silent");
  });
});

describe("inbox loading presentation", () => {
  it("shows full-screen loader only for the first initial load", () => {
    assert.equal(shouldSetInboxLoadingState("initial", false), true);
    assert.equal(shouldSetInboxLoadingState("initial", true), false);
    assert.equal(shouldSetInboxLoadingState("silent", false), false);
    assert.equal(shouldShowInboxFullScreenLoader(true, false), true);
    assert.equal(shouldShowInboxFullScreenLoader(true, true), false);
  });

  it("uses refresh control only for explicit pull-to-refresh", () => {
    assert.equal(shouldSetInboxRefreshingState("refresh"), true);
    assert.equal(shouldSetInboxRefreshingState("silent"), false);
    assert.equal(shouldSetInboxRefreshingState("initial"), false);
  });

  it("keeps cached inbox visible during background refresh errors", () => {
    assert.equal(shouldShowInboxFullScreenError("Failed", true), false);
    assert.equal(shouldClearInboxOnLoadError(true), false);
  });

  it("shows full-screen error only when there is no cached inbox data", () => {
    assert.equal(shouldShowInboxFullScreenError("Failed", false), true);
    assert.equal(shouldClearInboxOnLoadError(false), true);
  });
});
