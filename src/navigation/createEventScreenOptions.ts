/** Native swipe-back is incompatible with beforeRemove on native-stack for draft protection. */
export const createEventScreenOptions = {
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
} as const;
