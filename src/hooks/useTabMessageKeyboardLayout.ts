import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants/theme";
import { useAnimatedKeyboardHeight } from "./useAnimatedKeyboardHeight";

/** DM / grup sohbet composer'ı — tab bar + safe area dinamik */
export function useTabMessageKeyboardLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { animatedHeight: keyboardPadding, isKeyboardVisible } = useAnimatedKeyboardHeight({
    contentBottomOffset: tabBarHeight,
    extraOffset: 6,
  });

  return {
    isKeyboardVisible,
    keyboardPadding,
    restingBottomInset: insets.bottom,
  };
}
