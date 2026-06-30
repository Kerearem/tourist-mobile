import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../../constants/env";
import { resolveLocalImageUri } from "./resolveImagePickerAssetUri";

const DEFAULT_UPLOAD_TIMEOUT_MS = 30_000;

export type UploadImageOptions = {
  folder?: string;
  publicId?: string;
  timeoutMs?: number;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: { message?: string };
};

const getCloudinaryConfig = () => {
  const cloudName = CLOUDINARY_CLOUD_NAME.trim();
  const uploadPreset = CLOUDINARY_UPLOAD_PRESET.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
  }

  return { cloudName, uploadPreset };
};

const inferMimeType = (uri: string) => {
  const normalized = uri.split("?")[0]?.toLowerCase() ?? "";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
};

const inferFileName = (uri: string) => {
  const segment = uri.split("/").pop()?.split("?")[0];
  if (segment && segment.includes(".")) {
    return segment;
  }
  return `upload-${Date.now()}.jpg`;
};

export async function uploadImage(localUri: string, options: UploadImageOptions = {}): Promise<string> {
  const trimmedUri = localUri.trim();
  if (!trimmedUri) {
    throw new Error("No image selected.");
  }

  const uploadableUri = await resolveLocalImageUri(trimmedUri);

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const timeoutMs = options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("file", {
      uri: uploadableUri,
      type: inferMimeType(uploadableUri),
      name: inferFileName(uploadableUri),
    } as unknown as Blob);
    formData.append("upload_preset", uploadPreset);

    if (options.folder) {
      formData.append("folder", options.folder);
    }
    if (options.publicId) {
      formData.append("public_id", options.publicId);
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Cloudinary upload failed.");
    }

    const secureUrl = payload.secure_url?.trim();
    if (!secureUrl || !secureUrl.startsWith("https://")) {
      throw new Error("Cloudinary did not return a secure URL.");
    }

    return secureUrl;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timed out. Please try again.");
    }
    throw error instanceof Error ? error : new Error("Cloudinary upload failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export type UploadVideoOptions = UploadImageOptions;

const inferVideoMimeType = (uri: string) => {
  const normalized = uri.split("?")[0]?.toLowerCase() ?? "";
  if (normalized.endsWith(".mov")) return "video/quicktime";
  if (normalized.endsWith(".webm")) return "video/webm";
  return "video/mp4";
};

const inferVideoFileName = (uri: string) => {
  const segment = uri.split("/").pop()?.split("?")[0];
  if (segment && segment.includes(".")) {
    return segment;
  }
  return `upload-${Date.now()}.mp4`;
};

export async function uploadVideo(localUri: string, options: UploadVideoOptions = {}): Promise<string> {
  const trimmedUri = localUri.trim();
  if (!trimmedUri) {
    throw new Error("No video selected.");
  }

  const uploadableUri = await resolveLocalImageUri(trimmedUri);
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("file", {
      uri: uploadableUri,
      type: inferVideoMimeType(uploadableUri),
      name: inferVideoFileName(uploadableUri),
    } as unknown as Blob);
    formData.append("upload_preset", uploadPreset);

    if (options.folder) {
      formData.append("folder", options.folder);
    }
    if (options.publicId) {
      formData.append("public_id", options.publicId);
    }

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Cloudinary video upload failed.");
    }

    const secureUrl = payload.secure_url?.trim();
    if (!secureUrl || !secureUrl.startsWith("https://")) {
      throw new Error("Cloudinary did not return a secure video URL.");
    }

    return secureUrl;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Video upload timed out. Please try again.");
    }
    throw error instanceof Error ? error : new Error("Cloudinary video upload failed.");
  } finally {
    clearTimeout(timeout);
  }
}
