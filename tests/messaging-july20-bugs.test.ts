import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("group chat DM action parity", () => {
  const groupSource = source("src/features/messages/screens/GroupDetailScreen.tsx");
  const actionSource = source("src/features/messages/components/MessageActionSheet.tsx");

  it("reuses MessageActionSheet instead of a group-only sheet", () => {
    assert.match(groupSource, /from "\.\.\/components\/MessageActionSheet"/);
    assert.match(groupSource, /<MessageActionSheet/);
    assert.doesNotMatch(groupSource, /function GroupMessageActionSheet/);
    assert.doesNotMatch(groupSource, /<GroupMessageActionSheet/);
  });

  it("wires reply, reaction, delete, and optional pin through the shared sheet", () => {
    assert.match(groupSource, /onReply=\{chooseReply\}/);
    assert.match(groupSource, /chooseReaction/);
    assert.match(groupSource, /confirmDeleteMessage/);
    assert.match(groupSource, /setMessageReaction/);
    assert.match(groupSource, /removeMessageReaction/);
    assert.match(groupSource, /replyToMessageId: replyTarget\?\.id/);
    assert.match(groupSource, /replyTarget=\{replyTarget\}/);
    assert.match(groupSource, /pinLabel=/);
    assert.match(actionSource, /pinLabel/);
    assert.match(actionSource, /onPinToggle/);
  });
});

describe("media-only bubble layout", () => {
  const bubbleSource = source("src/features/messages/components/MessageBubble.tsx");

  it("renders image-only messages without the colored text bubble", () => {
    assert.match(bubbleSource, /const isMediaOnly = hasMedia && !hasText/);
    assert.match(bubbleSource, /mediaOnlyWrap/);
    assert.match(bubbleSource, /mediaOverlayFooter/);
    assert.match(bubbleSource, /isMediaOnly \? \(/);
  });
});

describe("group info completed-event resilience", () => {
  const infoSource = source("src/features/messages/screens/GroupInfoScreen.tsx");

  it("loads the group even when getEventById fails", () => {
    assert.match(infoSource, /getEventGroup\(route\.params\.eventId\)/);
    assert.match(infoSource, /getEventById\(route\.params\.eventId\)/);
    assert.doesNotMatch(
      infoSource,
      /Promise\.all\(\[\s*getEventGroup\(route\.params\.eventId\),\s*getEventById\(route\.params\.eventId\),?\s*\]\)/,
    );
    assert.match(infoSource, /setGroup\(groupResult\)/);
    assert.match(infoSource, /catch \{\s*setEvent\(null\);\s*\}/s);
  });
});

describe("DM header more button", () => {
  const threadSource = source("src/features/messages/screens/MessageThreadScreen.tsx");

  it("opens conversation info from the three-dot control", () => {
    assert.match(threadSource, /accessibilityLabel="Sohbet bilgisi"/);
    assert.match(threadSource, /onPress=\{openConversationInfo\}/);
    assert.match(threadSource, /hitSlop=\{12\}/);
  });
});
