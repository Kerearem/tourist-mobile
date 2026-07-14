import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ConversationMessage } from "../src/features/messages/types";
import {
  formatMessageDayLabel,
  isSameCalendarDay,
  shouldShowDaySeparator,
} from "../src/features/messages/utils/messageDaySeparators";
import { resolveMessageReceiptTickVisual } from "../src/features/messages/utils/messageReceiptTicks";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const makeMessage = (id: string, createdAt: string): ConversationMessage => ({
  id,
  conversationId: "conv-1",
  sender: { id: "peer", displayName: "Peer" },
  type: "text",
  text: "hello",
  createdAt,
});

describe("formatMessageDayLabel", () => {
  const now = new Date(2026, 6, 14, 23, 30); // 14 Temmuz 2026, local time

  it("returns Bugün for today", () => {
    assert.equal(formatMessageDayLabel(new Date(2026, 6, 14, 9, 0).toISOString(), now), "Bugün");
  });

  it("returns Dün for yesterday", () => {
    assert.equal(formatMessageDayLabel(new Date(2026, 6, 13, 22, 0).toISOString(), now), "Dün");
  });

  it("returns a Turkish calendar date for older days", () => {
    assert.equal(formatMessageDayLabel(new Date(2026, 6, 1, 12, 0).toISOString(), now), "1 Temmuz 2026");
    assert.equal(formatMessageDayLabel(new Date(2025, 11, 31, 12, 0).toISOString(), now), "31 Aralık 2025");
  });

  it("never returns a clock time", () => {
    const label = formatMessageDayLabel(new Date(2026, 5, 2, 17, 0).toISOString(), now);
    assert.doesNotMatch(label, /\d{1,2}:\d{2}/);
  });

  it("returns empty string for invalid dates", () => {
    assert.equal(formatMessageDayLabel("not-a-date", now), "");
  });
});

describe("shouldShowDaySeparator", () => {
  it("shows before the first message", () => {
    assert.equal(shouldShowDaySeparator(makeMessage("1", new Date(2026, 6, 14, 9, 0).toISOString()), null), true);
  });

  it("hides when the previous message is on the same calendar day", () => {
    const previous = makeMessage("1", new Date(2026, 6, 14, 9, 0).toISOString());
    const current = makeMessage("2", new Date(2026, 6, 14, 17, 0).toISOString());
    assert.equal(shouldShowDaySeparator(current, previous), false);
  });

  it("shows when the calendar day changes", () => {
    const previous = makeMessage("1", new Date(2026, 6, 13, 23, 59).toISOString());
    const current = makeMessage("2", new Date(2026, 6, 14, 0, 1).toISOString());
    assert.equal(shouldShowDaySeparator(current, previous), true);
  });

  it("isSameCalendarDay compares local dates", () => {
    assert.equal(isSameCalendarDay(new Date(2026, 6, 14, 0, 0), new Date(2026, 6, 14, 23, 59)), true);
    assert.equal(isSameCalendarDay(new Date(2026, 6, 14), new Date(2026, 6, 15)), false);
  });
});

describe("receipt ticks still map correctly", () => {
  it("sent single gray, delivered double gray, read double blue", () => {
    assert.deepEqual(resolveMessageReceiptTickVisual("sent"), { icon: "checkmark", color: "#94A3B8" });
    assert.deepEqual(resolveMessageReceiptTickVisual("delivered"), { icon: "checkmark-done", color: "#94A3B8" });
    assert.deepEqual(resolveMessageReceiptTickVisual("read"), { icon: "checkmark-done", color: "#2563EB" });
  });
});

describe("bubble footer layout regression", () => {
  const bubbleSource = readSource("src/features/messages/components/MessageBubble.tsx");

  it("renders the time + tick footer inside the bubble body, not outside", () => {
    assert.match(bubbleSource, /bubbleFooter/);
    // Footer must be part of bubbleBody (inside bubbleStyles view).
    assert.match(bubbleSource, /\{bubbleFooter\}\s*<\/View>\s*\);\s*\n\s*const bubbleContent/);
    // Old outside-the-bubble meta row is gone.
    assert.doesNotMatch(bubbleSource, /dmMetaRow/);
    assert.doesNotMatch(bubbleSource, /timeLabelMine/);
  });

  it("footer is a flex row aligned bottom-right, no absolute positioning", () => {
    assert.match(bubbleSource, /bubbleFooter:\s*\{[^}]*alignSelf:\s*"flex-end"/);
    assert.match(bubbleSource, /bubbleFooter:\s*\{[^}]*flexDirection:\s*"row"/);
    assert.doesNotMatch(bubbleSource, /position:\s*"absolute"/);
  });

  it("outgoing bubbles include the receipt tick in the footer; incoming only time", () => {
    assert.match(bubbleSource, /const receiptTick = isMine \? resolveMessageReceiptTickVisual\(message\.status\) : null;/);
    assert.match(bubbleSource, /name=\{receiptTick\.icon\}/);
  });
});

describe("thread day separator wiring", () => {
  const threadSource = readSource("src/features/messages/screens/MessageThreadScreen.tsx");

  it("renders day separators only on day changes and drops the old time pill", () => {
    assert.match(threadSource, /shouldShowDaySeparator\(item, previousMessage\)/);
    assert.match(threadSource, /formatMessageDayLabel\(item\.createdAt\)/);
    assert.doesNotMatch(threadSource, /formatThreadTime/);
    assert.doesNotMatch(threadSource, /timePill/);
  });
});
