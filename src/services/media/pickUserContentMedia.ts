import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import {
  getImagePickerOptionsForKind,
  type UserContentMediaKind,
} from "./mediaContentContracts";
import { normalizeImageToMediaAspect } from "./normalizeImageToMediaAspect";
import { resolveImagePickerAssetUri } from "./resolveImagePickerAssetUri";

export type PickedUserContentMedia = {
  uri: string;
  type: "IMAGE" | "VIDEO";
  width?: number;
  height?: number;
};

export async function pickUserContentMedia(
  kind: UserContentMediaKind,
): Promise<PickedUserContentMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Galeri erişim izni gerekli.");
  }

  const pickerOptions = getImagePickerOptionsForKind(kind, Platform.OS);
  const result = await ImagePicker.launchImageLibraryAsync({
    ...pickerOptions,
    allowsMultipleSelection: false,
    shouldDownloadFromNetwork: true,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const type = asset.type === "video" ? "VIDEO" : "IMAGE";
  let uri = await resolveImagePickerAssetUri(asset);

  // Event covers must be stored as true 16:9 pixels so card/detail framing
  // matches what the user confirmed in preview (iOS cannot native-crop to 16:9).
  if (kind === "eventCover" && type === "IMAGE") {
    uri = await normalizeImageToMediaAspect(uri, "eventCover");
  }

  return {
    uri,
    type,
    ...(asset.width ? { width: asset.width } : {}),
    ...(asset.height ? { height: asset.height } : {}),
  };
}

export async function pickEventCoverImage(): Promise<PickedUserContentMedia | null> {
  return pickUserContentMedia("eventCover");
}
