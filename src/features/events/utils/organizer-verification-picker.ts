import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { VerificationDocumentType, VerificationUploadFile } from "../types/organizer";
import {
  extensionForVerificationMimeType,
  heicUploadRejectionMessage,
  isHeicMimeType,
  normalizeMimeType,
  normalizeVerificationUploadFileMetadata,
  resolveVerificationFileSizeBytes,
  resolveVerificationUploadMimeType,
  sanitizeVerificationFileName,
  validateVerificationUploadFile,
  VERIFICATION_MAX_FILE_BYTES,
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

export async function pickVerificationSelfieFile(source: "camera" | "library"): Promise<VerificationUploadFile | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === "camera"
        ? "Selfie çekmek için kamera izni gerekli."
        : "Selfie seçmek için galeri izni gerekli.",
    );
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.9,
        })
      : await ImagePicker.launchImageLibraryAsync({
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

  const sizeBytes = await resolveVerificationFileSizeBytes(asset.uri, asset.fileSize ?? null);
  const mimeType = normalizeMimeType(resolvedMimeType);
  const file: VerificationUploadFile = {
    uri: asset.uri,
    name: sanitizeVerificationFileName(asset.fileName ?? "", extensionForVerificationMimeType(mimeType)),
    mimeType,
    sizeBytes,
  };

  const validationError = validateVerificationUploadFile(file, "SELFIE");
  if (validationError) {
    throw new Error(validationError);
  }

  if (file.sizeBytes > VERIFICATION_MAX_FILE_BYTES) {
    throw new Error("Dosya boyutu en fazla 10 MB olabilir.");
  }

  return file;
}
