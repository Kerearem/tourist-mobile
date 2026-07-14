import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  COMMENTS_SHEET_KEYBOARD_HEIGHT_RATIO,
  COMMENTS_SHEET_MIN_TOP_GAP,
  resolveCommentsSheetKeyboardStyle,
} from "../src/features/explore/utils/exploreCommentsKeyboardLayout";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("explore comments sheet keyboard layout", () => {
  it("returns no override while the keyboard is hidden", () => {
    assert.equal(
      resolveCommentsSheetKeyboardStyle({
        isKeyboardVisible: false,
        windowHeight: 852,
        topInset: 59,
      }),
      null,
    );
  });

  it("grows the sheet toward the top of the screen when the keyboard opens", () => {
    const style = resolveCommentsSheetKeyboardStyle({
      isKeyboardVisible: true,
      windowHeight: 852,
      topInset: 59,
    });

    assert.ok(style);
    assert.equal(
      style.height,
      Math.min(
        Math.round(852 * COMMENTS_SHEET_KEYBOARD_HEIGHT_RATIO),
        852 - 59 - COMMENTS_SHEET_MIN_TOP_GAP,
      ),
    );
    assert.equal(style.maxHeight, style.height);
    // Larger than the default 74% cap so the comments list stays visible.
    assert.ok(style.height > 852 * 0.74);
  });

  it("never overlaps the top safe area inset", () => {
    const windowHeight = 700;
    const topInset = 120;
    const style = resolveCommentsSheetKeyboardStyle({
      isKeyboardVisible: true,
      windowHeight,
      topInset,
    });

    assert.ok(style);
    assert.equal(style.height, windowHeight - topInset - COMMENTS_SHEET_MIN_TOP_GAP);
  });

  it("applies the keyboard style to the comments sheet in ExploreFeedScreen", () => {
    const source = readSource("src/features/explore/screens/ExploreFeedScreen.tsx");

    assert.match(source, /resolveCommentsSheetKeyboardStyle\(\{/);
    assert.match(
      source,
      /styles\.commentsSheet,\s*!isKeyboardVisible \? \{ paddingBottom: sheetBottomPadding \} : null,\s*resolveCommentsSheetKeyboardStyle\(/,
    );
  });

  it("keeps the comment lists tappable and the composer keyboard spacer intact", () => {
    const source = readSource("src/features/explore/screens/ExploreFeedScreen.tsx");

    assert.match(source, /keyboardShouldPersistTaps="handled"/);
    assert.match(source, /styles\.keyboardFill, \{ height: keyboardPadding \}/);
    assert.match(source, /styles\.composerDock/);
  });
});
