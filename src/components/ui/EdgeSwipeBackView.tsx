import React, { useMemo, useRef } from "react";
import { Animated, StyleSheet, useWindowDimensions, PanResponder } from "react-native";

import {
  shouldClaimEdgeSwipeBack,
  shouldCompleteEdgeSwipeBack,
} from "../../utils/edgeSwipeBack";

type EdgeSwipeBackViewProps = {
  children: React.ReactNode;
  /** Called when the user completes a left-edge swipe-back gesture. */
  onSwipeBack: () => void;
};

/**
 * Adds an iOS-style left-edge swipe-back gesture to overlay content that is
 * not presented in a native stack (so native swipe-back is unavailable).
 * Uses the built-in PanResponder; capture-phase claiming from the edge keeps
 * inner scroll views working everywhere else.
 */
export function EdgeSwipeBackView({ children, onSwipeBack }: EdgeSwipeBackViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const onSwipeBackRef = useRef(onSwipeBack);
  onSwipeBackRef.current = onSwipeBack;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          shouldClaimEdgeSwipeBack({
            startX: gesture.x0,
            dx: gesture.dx,
            dy: gesture.dy,
          }),
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(0, gesture.dx));
        },
        onPanResponderRelease: (_, gesture) => {
          if (shouldCompleteEdgeSwipeBack({ dx: gesture.dx, vx: gesture.vx })) {
            Animated.timing(translateX, {
              duration: 160,
              toValue: windowWidth,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              onSwipeBackRef.current();
            });
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateX, windowWidth],
  );

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
