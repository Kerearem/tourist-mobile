import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Keyboard, Platform, type KeyboardEvent } from "react-native";

const DEFAULT_DURATION_MS = 250;

type UseAnimatedKeyboardHeightOptions = {
  /**
   * Pencere altından composer container'ının altına kadar olan mesafe.
   * Tab ekranları için `useBottomTabBarHeight()` kullanın — sabit px değil.
   */
  contentBottomOffset?: number;
  /** İnce ayar: pozitif = composer biraz daha yukarı (theme.spacing token kullanın) */
  extraOffset?: number;
};

export function useAnimatedKeyboardHeight(options: UseAnimatedKeyboardHeightOptions = {}) {
  const { contentBottomOffset = 0, extraOffset = 0 } = options;
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const animate = (toValue: number, duration: number) => {
      Animated.timing(animatedHeight, {
        duration: Math.max(duration, 0),
        easing: Easing.out(Easing.cubic),
        toValue,
        useNativeDriver: false,
      }).start();
    };

    const resolveHeight = (event: KeyboardEvent) => {
      const { screenY } = event.endCoordinates;
      const windowHeight = Dimensions.get("window").height;
      return Math.max(0, windowHeight - contentBottomOffset - screenY + extraOffset);
    };

    const onShow = (event: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      const duration = Platform.OS === "ios" ? (event.duration ?? DEFAULT_DURATION_MS) : DEFAULT_DURATION_MS;
      animate(resolveHeight(event), duration);
    };

    const onHide = (event: KeyboardEvent) => {
      setIsKeyboardVisible(false);
      const duration = Platform.OS === "ios" ? (event.duration ?? DEFAULT_DURATION_MS) : DEFAULT_DURATION_MS;
      animate(0, duration);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [animatedHeight, contentBottomOffset, extraOffset]);

  return { animatedHeight, isKeyboardVisible };
}
