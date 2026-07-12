import * as ImagePicker from "expo-image-picker";

import {
  getImagePickerOptionsForKind,
  type UserContentMediaKind,
} from "./mediaContentContracts";
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

  const pickerOptions = getImagePickerOptionsForKind(kind);
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
  const uri = await resolveImagePickerAssetUri(asset);

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
