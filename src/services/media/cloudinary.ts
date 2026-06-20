import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../../constants/env";

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

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const timeoutMs = options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    formData.append("file", {
      uri: trimmedUri,
      type: inferMimeType(trimmedUri),
      name: inferFileName(trimmedUri),
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
