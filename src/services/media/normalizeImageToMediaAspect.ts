import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import { getMediaContentContract, type UserContentMediaKind } from "./mediaContentContracts";
import { resolveCenterCropRect } from "./resolveCenterCropRect";

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
 * Center-crops the image so its bitmap matches the content contract aspect.
 * No-op when already close enough. Used for event covers so the uploaded
 * pixels match EventCard / EventDetail 16:9 framing.
 */
export async function normalizeImageToMediaAspect(
  uri: string,
  kind: UserContentMediaKind,
): Promise<string> {
  const contract = getMediaContentContract(kind);
  const { width, height } = await getImageSize(uri);
  const crop = resolveCenterCropRect(
    width,
    height,
    contract.aspectWidth,
    contract.aspectHeight,
  );

  if (!crop) {
    return uri;
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}
