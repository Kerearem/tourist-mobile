import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { resolveImagePickerAssetUri } from "../../../services/media/resolveImagePickerAssetUri";
import type { VerificationDocumentType, VerificationUploadFile } from "../types/organizer";
import {
  extensionForVerificationMimeType,
  heicUploadRejectionMessage,
  isHeicMimeType,
  normalizeVerificationUploadFileMetadata,
  resolveVerificationFileSizeBytes,
  resolveVerificationUploadMimeType,
} from "../utils/organizer-verification";

const DEFAULT_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export { resolveVerificationFileSizeBytes } from "../utils/organizer-verification";

export async function pickVerificationDocumentFile(
  documentType: VerificationDocumentType,
): Promise<VerificationUploadFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: DEFAULT_DOCUMENT_MIME_TYPES,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const resolvedMimeType = resolveVerificationUploadMimeType(asset.mimeType, asset.name ?? "");

  if (isHeicMimeType(resolvedMimeType)) {
    throw new Error(heicUploadRejectionMessage());
  }

  const sizeBytes = await resolveVerificationFileSizeBytes(asset.uri, asset.size ?? null);

  return normalizeVerificationUploadFileMetadata(
    {
      uri: asset.uri,
      name: asset.name,
      mimeType: resolvedMimeType,
      sizeBytes,
    },
    documentType,
  );
}

export async function pickVerificationGalleryFile(
  documentType: VerificationDocumentType,
): Promise<VerificationUploadFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Belge seçmek için galeri izni gerekli.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const resolvedMimeType = resolveVerificationUploadMimeType(asset.mimeType, asset.fileName ?? "");

  if (isHeicMimeType(resolvedMimeType)) {
    throw new Error(heicUploadRejectionMessage());
  }

  const uploadableUri = await resolveImagePickerAssetUri(asset);
  const sizeBytes = await resolveVerificationFileSizeBytes(uploadableUri, asset.fileSize ?? null);

  return normalizeVerificationUploadFileMetadata(
    {
      uri: uploadableUri,
      name: asset.fileName,
      mimeType: resolvedMimeType,
      sizeBytes,
    },
    documentType,
  );
}

export async function buildVerificationUploadFileFromCapture(input: {
  uri: string;
  documentType: VerificationDocumentType;
  fileName?: string;
}): Promise<VerificationUploadFile> {
  const defaultName =
    input.documentType === "SELFIE"
      ? `selfie-${Date.now()}.jpg`
      : `kimlik-${Date.now()}.jpg`;
  const sizeBytes = await resolveVerificationFileSizeBytes(input.uri, null);

  return normalizeVerificationUploadFileMetadata(
    {
      uri: input.uri,
      name: input.fileName ?? defaultName,
      mimeType: "image/jpeg",
      sizeBytes,
    },
    input.documentType,
  );
}
