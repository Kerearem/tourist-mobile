import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants/theme";
import { useAnimatedKeyboardHeight } from "./useAnimatedKeyboardHeight";

type Options = {
  /** Klavye kapalıyken sheet alt boşluğu için minimum spacing token */
  minSheetBottomSpacing?: number;
  /** Klavye açıkken composer ince ayar (px) */
  extraOffset?: number;
};

/** Snap yorum sheet'i — tam ekran alt, safe area dinamik */
export function useModalCommentKeyboardLayout(options: Options = {}) {
  const { minSheetBottomSpacing = theme.spacing.md, extraOffset = theme.spacing.xs } = options;
  const insets = useSafeAreaInsets();
  const { animatedHeight: keyboardPadding, isKeyboardVisible } = useAnimatedKeyboardHeight({
    contentBottomOffset: 0,
    extraOffset,
  });

  const sheetBottomPadding = Math.max(insets.bottom, minSheetBottomSpacing);

  return {
    isKeyboardVisible,
    keyboardPadding,
    sheetBottomPadding,
  };
}
