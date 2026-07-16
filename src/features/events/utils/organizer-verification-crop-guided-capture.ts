import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import type { GuidedCaptureMode } from "./organizer-verification-capture";
import {
  mapCoverFrameToPhotoCrop,
  resolveGuidedCaptureFrameRect,
} from "./organizer-verification-guided-crop";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

/**
 * Crops a guided KYC capture to the on-screen overlay frame (cover mapping).
 * Front-camera captures set mirrorHorizontal so framing matches the mirrored preview.
 */
export async function cropGuidedCaptureToOverlayFrame(input: {
  uri: string;
  mode: GuidedCaptureMode;
  screenWidth: number;
  screenHeight: number;
  facing: "front" | "back";
}): Promise<string> {
  const { width: photoWidth, height: photoHeight } = await getImageSize(input.uri);
  const frame = resolveGuidedCaptureFrameRect(input.mode, input.screenWidth, input.screenHeight);
  const crop = mapCoverFrameToPhotoCrop({
    screenWidth: input.screenWidth,
    screenHeight: input.screenHeight,
    photoWidth,
    photoHeight,
    frame,
    mirrorHorizontal: input.facing === "front",
  });

  const result = await ImageManipulator.manipulateAsync(
    input.uri,
    [{ crop }],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}
