/**
 * Keyboard layout math for the Explore comments sheet.
 *
 * The sheet reserves the keyboard height with an inner spacer, so with the
 * default `maxHeight: 74%` cap the comments list gets squeezed to almost
 * nothing once the keyboard opens. When the keyboard is visible we grow the
 * sheet toward the top of the screen so the list stays visible and
 * scrollable above the composer.
 */
export const COMMENTS_SHEET_KEYBOARD_HEIGHT_RATIO = 0.92;
export const COMMENTS_SHEET_MIN_TOP_GAP = 12;

export type CommentsSheetKeyboardStyle = {
  height: number;
  maxHeight: number;
};

export function resolveCommentsSheetKeyboardStyle(params: {
  isKeyboardVisible: boolean;
  windowHeight: number;
  topInset: number;
}): CommentsSheetKeyboardStyle | null {
  if (!params.isKeyboardVisible) {
    return null;
  }

  const availableHeight = Math.max(
    0,
    params.windowHeight - params.topInset - COMMENTS_SHEET_MIN_TOP_GAP,
  );
  const height = Math.min(
    Math.round(params.windowHeight * COMMENTS_SHEET_KEYBOARD_HEIGHT_RATIO),
    availableHeight,
  );

  return { height, maxHeight: height };
}
