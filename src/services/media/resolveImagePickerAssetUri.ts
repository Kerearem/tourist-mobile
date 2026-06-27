import type { ImagePickerAsset } from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

const UPLOADABLE_URI_PATTERN = /^(file:|content:|https?:)/i;

const isUploadableUri = (uri: string) => UPLOADABLE_URI_PATTERN.test(uri.trim());

const extractAssetIdFromPhUri = (uri: string) => {
  const trimmed = uri.trim();
  if (!trimmed.startsWith("ph://")) {
    return null;
  }
  const withoutScheme = trimmed.slice("ph://".length);
  const assetId = withoutScheme.split("/")[0]?.trim();
  return assetId || null;
};

export async function resolveImagePickerAssetUri(asset: ImagePickerAsset): Promise<string> {
  const uri = asset.uri.trim();
  if (!uri) {
    throw new Error("Geçersiz fotoğraf seçimi.");
  }

  if (isUploadableUri(uri)) {
    return uri;
  }

  const assetId = asset.assetId?.trim() || extractAssetIdFromPhUri(uri);
  if (!assetId) {
    throw new Error("Seçilen fotoğrafa erişilemedi. Lütfen başka bir fotoğraf deneyin.");
  }

  const info = await MediaLibrary.getAssetInfoAsync(assetId, {
    shouldDownloadFromNetwork: true,
  });

  const localUri = info.localUri?.trim();
  if (localUri && isUploadableUri(localUri)) {
    return localUri;
  }

  throw new Error("Seçilen fotoğrafa erişilemedi. Lütfen başka bir fotoğraf deneyin.");
}

export async function resolveLocalImageUri(uri: string, assetId?: string | null): Promise<string> {
  const trimmed = uri.trim();
  if (!trimmed) {
    throw new Error("Geçersiz fotoğraf.");
  }

  if (isUploadableUri(trimmed)) {
    return trimmed;
  }

  return resolveImagePickerAssetUri({ uri: trimmed, assetId, width: 0, height: 0 });
}
