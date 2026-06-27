import * as ImagePicker from "expo-image-picker";

import { resolveImagePickerAssetUri } from "./resolveImagePickerAssetUri";

export type PickGalleryImageOptions = Pick<
  ImagePicker.ImagePickerOptions,
  "allowsEditing" | "aspect" | "quality"
>;

const DEFAULT_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsMultipleSelection: false,
  quality: 0.85,
  shouldDownloadFromNetwork: true,
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export async function pickGalleryImage(options: PickGalleryImageOptions = {}): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Galeri izni gerekli.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    ...DEFAULT_OPTIONS,
    ...options,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return resolveImagePickerAssetUri(result.assets[0]);
}
