import type { GuidedCaptureMode } from "./organizer-verification-capture";

export type GuidedCaptureFrameRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Single source of truth for the guided KYC overlay frame.
 * Must stay in sync with VerificationGuidedCaptureOverlay layout.
 */
export function resolveGuidedCaptureFrameRect(
  mode: GuidedCaptureMode,
  screenWidth: number,
  screenHeight: number,
): GuidedCaptureFrameRect {
  const frameWidth = mode === "identity" ? screenWidth * 0.88 : screenWidth * 0.68;
  const frameHeight = mode === "identity" ? frameWidth * 0.63 : frameWidth * 1.28;
  const left = (screenWidth - frameWidth) / 2;
  const top = screenHeight * 0.26;
  return { left, top, width: frameWidth, height: frameHeight };
}

export type CoverMappedCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Maps an on-screen frame rect into photo pixel space when the camera
 * preview uses resizeMode "cover" (uniform scale, centered).
 *
 * When `mirrorHorizontal` is true (front-camera preview mirroring), the
 * crop X origin is flipped so it matches the mirrored framing the user saw.
 */
export function mapCoverFrameToPhotoCrop(input: {
  screenWidth: number;
  screenHeight: number;
  photoWidth: number;
  photoHeight: number;
  frame: GuidedCaptureFrameRect;
  mirrorHorizontal?: boolean;
}): CoverMappedCropRect {
  const {
    screenWidth,
    screenHeight,
    photoWidth,
    photoHeight,
    frame,
    mirrorHorizontal = false,
  } = input;

  const scale = Math.max(screenWidth / photoWidth, screenHeight / photoHeight);
  const displayedWidth = photoWidth * scale;
  const displayedHeight = photoHeight * scale;
  const originXOnScreen = (screenWidth - displayedWidth) / 2;
  const originYOnScreen = (screenHeight - displayedHeight) / 2;

  let originX = (frame.left - originXOnScreen) / scale;
  let originY = (frame.top - originYOnScreen) / scale;
  let width = frame.width / scale;
  let height = frame.height / scale;

  if (mirrorHorizontal) {
    originX = photoWidth - originX - width;
  }

  // Clamp to photo bounds (integer pixels for ImageManipulator).
  originX = Math.max(0, Math.min(photoWidth - 1, Math.round(originX)));
  originY = Math.max(0, Math.min(photoHeight - 1, Math.round(originY)));
  width = Math.max(1, Math.min(photoWidth - originX, Math.round(width)));
  height = Math.max(1, Math.min(photoHeight - originY, Math.round(height)));

  return { originX, originY, width, height };
}
