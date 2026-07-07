import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { VerificationDocumentType, VerificationUploadFile } from "../types/organizer";
import {
  normalizeMimeType,
  validateVerificationUploadFile,
  VERIFICATION_MAX_FILE_BYTES,
} from "../utils/organizer-verification";

const DEFAULT_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

async function resolveFileSizeBytes(uri: string, reportedSize?: number | null): Promise<number> {
  if (typeof reportedSize === "number" && reportedSize > 0) {
    return reportedSize;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size > 0) {
      return blob.size;
    }
  } catch {
    // fall through
  }

  return 0;
}

function sanitizeFileName(name: string, fallbackExtension: string) {
  const trimmed = name.trim();
  if (trimmed) {
    return trimmed;
  }

  return `belge-${Date.now()}.${fallbackExtension}`;
}

function extensionForMimeType(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);
  if (normalized === "image/png") return "png";
  if (normalized === "application/pdf") return "pdf";
  return "jpg";
}

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
  const mimeType = normalizeMimeType(asset.mimeType ?? "application/octet-stream");
  const sizeBytes = await resolveFileSizeBytes(asset.uri, asset.size ?? null);
  const file: VerificationUploadFile = {
    uri: asset.uri,
    name: sanitizeFileName(asset.name ?? "", extensionForMimeType(mimeType)),
    mimeType,
    sizeBytes,
  };

  const validationError = validateVerificationUploadFile(file, documentType);
  if (validationError) {
    throw new Error(validationError);
  }

  return file;
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
  const rawMimeType = asset.mimeType ?? "image/jpeg";
  const mimeType = normalizeMimeType(rawMimeType);

  if (mimeType === "image/heic" || mimeType === "image/heif") {
    throw new Error("HEIC formatı desteklenmiyor. Lütfen JPEG veya PNG seç.");
  }

  const sizeBytes = await resolveFileSizeBytes(asset.uri, asset.fileSize ?? null);
  const file: VerificationUploadFile = {
    uri: asset.uri,
    name: sanitizeFileName(asset.fileName ?? "", extensionForMimeType(mimeType)),
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
