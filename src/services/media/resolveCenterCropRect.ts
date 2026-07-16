/**
 * Pure geometry for center-cropping an image to a target aspect ratio.
 * Matches React Native Image `resizeMode: "cover"` framing (centered).
 */

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

const ASPECT_EPSILON = 0.02;

export function isAspectCloseEnough(
  width: number,
  height: number,
  aspectWidth: number,
  aspectHeight: number,
  epsilon: number = ASPECT_EPSILON,
): boolean {
  if (width <= 0 || height <= 0 || aspectWidth <= 0 || aspectHeight <= 0) {
    return false;
  }
  const current = width / height;
  const target = aspectWidth / aspectHeight;
  return Math.abs(current - target) <= epsilon;
}

/**
 * Returns the centered crop rect that yields `aspectWidth:aspectHeight`,
 * or null when the source already matches (within epsilon).
 */
export function resolveCenterCropRect(
  width: number,
  height: number,
  aspectWidth: number,
  aspectHeight: number,
): CropRect | null {
  if (width <= 0 || height <= 0 || aspectWidth <= 0 || aspectHeight <= 0) {
    return null;
  }

  if (isAspectCloseEnough(width, height, aspectWidth, aspectHeight)) {
    return null;
  }

  const target = aspectWidth / aspectHeight;
  const current = width / height;

  if (current > target) {
    // Too wide — trim left/right (same as cover cropping horizontal overflow).
    const cropWidth = Math.max(1, Math.round(height * target));
    const originX = Math.max(0, Math.round((width - cropWidth) / 2));
    return {
      originX,
      originY: 0,
      width: Math.min(cropWidth, width - originX),
      height,
    };
  }

  // Too tall — trim top/bottom.
  const cropHeight = Math.max(1, Math.round(width / target));
  const originY = Math.max(0, Math.round((height - cropHeight) / 2));
  return {
    originX: 0,
    originY,
    width,
    height: Math.min(cropHeight, height - originY),
  };
}
