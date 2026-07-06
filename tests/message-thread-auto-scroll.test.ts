import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  consumePendingScrollReason,
  resolveOwnMessageSentScrollPlan,
  shouldRunInitialScroll,
  shouldScrollMessageThread,
  shouldScrollOnKeyboardDidHide,
  shouldScrollOnKeyboardDidShow,
} from "../src/features/messages/utils/messageThreadAutoScroll";

describe("shouldScrollMessageThread", () => {
  it("scrolls on initial load when messages exist", () => {
    assert.equal(shouldScrollMessageThread("initial_load", 3), true);
  });

  it("scrolls when the keyboard opens and messages exist", () => {
    assert.equal(shouldScrollMessageThread("keyboard_opened", 1), true);
  });

  it("scrolls after the viewer sends a message", () => {
    assert.equal(shouldScrollMessageThread("own_message_sent", 5), true);
  });

  it("does not scroll without a reason", () => {
    assert.equal(shouldScrollMessageThread(null, 3), false);
  });

  it("does not scroll when the thread is empty", () => {
    assert.equal(shouldScrollMessageThread("initial_load", 0), false);
    assert.equal(shouldScrollMessageThread("keyboard_opened", 0), false);
    assert.equal(shouldScrollMessageThread("own_message_sent", 0), false);
  });
});

describe("shouldRunInitialScroll", () => {
  it("runs initial scroll after the thread finishes loading", () => {
    assert.equal(shouldRunInitialScroll(false, 4, false), true);
  });

  it("does not run while loading", () => {
    assert.equal(shouldRunInitialScroll(false, 4, true), false);
  });

  it("does not run again after the initial scroll already happened", () => {
    assert.equal(shouldRunInitialScroll(true, 4, false), false);
  });

  it("runs again after a thread reset clears the initial scroll flag", () => {
    assert.equal(shouldRunInitialScroll(false, 2, false), true);
  });
});

describe("shouldScrollOnKeyboardDidShow", () => {
  it("scrolls once after keyboardDidShow when messages exist", () => {
    assert.equal(shouldScrollOnKeyboardDidShow(3, false), true);
  });

  it("does not scroll again during the same keyboard session", () => {
    assert.equal(shouldScrollOnKeyboardDidShow(3, true), false);
  });

  it("does not scroll when the thread is empty", () => {
    assert.equal(shouldScrollOnKeyboardDidShow(0, false), false);
  });
});

describe("shouldScrollOnKeyboardDidHide", () => {
  it("does not scroll when the keyboard closes", () => {
    assert.equal(shouldScrollOnKeyboardDidHide(), false);
  });
});

describe("consumePendingScrollReason", () => {
  it("scrolls and clears a pending own-message reason", () => {
    assert.deepEqual(consumePendingScrollReason("own_message_sent", 2), {
      shouldScroll: true,
      nextPendingReason: null,
    });
  });

  it("does not scroll on an ordinary rerender without a pending reason", () => {
    assert.deepEqual(consumePendingScrollReason(null, 2), {
      shouldScroll: false,
      nextPendingReason: null,
    });
  });

  it("does not scroll when pending exists but the thread is empty", () => {
    assert.deepEqual(consumePendingScrollReason("initial_load", 0), {
      shouldScroll: false,
      nextPendingReason: "initial_load",
    });
  });

  it("clears keyboard_opened after the pending scroll is fulfilled", () => {
    assert.deepEqual(consumePendingScrollReason("keyboard_opened", 5), {
      shouldScroll: true,
      nextPendingReason: null,
    });
  });

  it("keeps own_message_sent pending until the first message renders", () => {
    assert.deepEqual(consumePendingScrollReason("own_message_sent", 0), {
      shouldScroll: false,
      nextPendingReason: "own_message_sent",
    });
    assert.deepEqual(consumePendingScrollReason("own_message_sent", 1), {
      shouldScroll: true,
      nextPendingReason: null,
    });
  });
});

describe("resolveOwnMessageSentScrollPlan", () => {
  it("defers scroll for the first message in an empty DM", () => {
    assert.deepEqual(resolveOwnMessageSentScrollPlan(0), {
      pendingReason: "own_message_sent",
      shouldScrollImmediately: false,
    });
  });

  it("scrolls immediately when messages already exist", () => {
    assert.deepEqual(resolveOwnMessageSentScrollPlan(3), {
      pendingReason: "own_message_sent",
      shouldScrollImmediately: true,
    });
  });
});
