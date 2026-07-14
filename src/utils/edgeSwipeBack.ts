/**
 * Pure gesture math for the JS edge swipe-back used by overlay-presented
 * screens (e.g. the Explore public profile overlay) that are not part of a
 * native stack and therefore have no native swipe-back.
 */
export const EDGE_SWIPE_BACK_EDGE_WIDTH = 28;
export const EDGE_SWIPE_BACK_CLAIM_DISTANCE = 10;
export const EDGE_SWIPE_BACK_DISTANCE_THRESHOLD = 72;
export const EDGE_SWIPE_BACK_VELOCITY_THRESHOLD = 0.35;

export type EdgeSwipeClaimInput = {
  /** Touch start X (gestureState.x0). */
  startX: number;
  dx: number;
  dy: number;
  edgeWidth?: number;
};

/** Claim the gesture only for rightward, horizontal drags starting at the left edge. */
export function shouldClaimEdgeSwipeBack(input: EdgeSwipeClaimInput): boolean {
  const edgeWidth = input.edgeWidth ?? EDGE_SWIPE_BACK_EDGE_WIDTH;
  if (input.startX > edgeWidth) {
    return false;
  }
  if (input.dx < EDGE_SWIPE_BACK_CLAIM_DISTANCE) {
    return false;
  }
  return Math.abs(input.dx) > Math.abs(input.dy) * 1.2;
}

export type EdgeSwipeCompleteInput = {
  dx: number;
  vx: number;
  distanceThreshold?: number;
  velocityThreshold?: number;
};

/** Complete swipe-back when the drag traveled far enough or was flicked fast enough. */
export function shouldCompleteEdgeSwipeBack(input: EdgeSwipeCompleteInput): boolean {
  const distanceThreshold = input.distanceThreshold ?? EDGE_SWIPE_BACK_DISTANCE_THRESHOLD;
  const velocityThreshold = input.velocityThreshold ?? EDGE_SWIPE_BACK_VELOCITY_THRESHOLD;
  if (input.dx >= distanceThreshold) {
    return true;
  }
  return input.dx >= EDGE_SWIPE_BACK_CLAIM_DISTANCE * 2 && input.vx >= velocityThreshold;
}
