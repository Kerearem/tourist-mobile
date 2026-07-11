import type { UploadIntentResponse, VerificationUploadFile } from "../../features/events/types/organizer";

export const VERIFICATION_UPLOAD_TIMEOUT_MS = 90_000;

export type VerificationUploadFormDataEntry = {
  name: string;
  value: string;
};

/**
 * Structured Cloudinary upload failure. Carries the HTTP status and a sanitized
 * (non-sensitive) technical message for dev diagnostics, plus a safe Turkish
 * user-facing message.
 */
export class CloudinaryUploadError extends Error {
  readonly status?: number;
  readonly sanitizedMessage: string;

  constructor(userMessage: string, sanitizedMessage: string, status?: number) {
    super(userMessage);
    this.name = "CloudinaryUploadError";
    this.status = status;
    this.sanitizedMessage = sanitizedMessage;
  }
}

export function sanitizeCloudinaryClientMessage(message: string): string {
  return message
    .replace(/signature[=:]\s*\S+/gi, "[redacted]")
    .replace(/api[_-]?key[=:]\s*\S+/gi, "[redacted]")
    .replace(/api[_-]?secret[=:]\s*\S+/gi, "[redacted]")
    .replace(/public[_-]?id[=:]\s*\S+/gi, "[redacted]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .trim();
}

export function buildVerificationUploadFormEntries(
  file: VerificationUploadFile,
  intent: UploadIntentResponse,
): VerificationUploadFormDataEntry[] {
  const entries: VerificationUploadFormDataEntry[] = [
    { name: "api_key", value: intent.fields.api_key },
    { name: "timestamp", value: intent.fields.timestamp },
    { name: "signature", value: intent.fields.signature },
    { name: "public_id", value: intent.fields.public_id },
    { name: "type", value: intent.fields.type },
    { name: "overwrite", value: intent.fields.overwrite },
  ];

  return entries;
}

export function buildVerificationUploadFormData(
  file: VerificationUploadFile,
  intent: UploadIntentResponse,
): FormData {
  const formData = new FormData();

  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  for (const entry of buildVerificationUploadFormEntries(file, intent)) {
    formData.append(entry.name, entry.value);
  }

  return formData;
}

export function mapCloudinaryUploadError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Belge yükleme zaman aşımına uğradı. İnternet bağlantını kontrol edip tekrar dene.";
    }

    const message = error.message.trim();
    if (message) {
      if (/network request failed/i.test(message)) {
        return "İnternet bağlantısı kurulamadı. Lütfen tekrar dene.";
      }
      return "Belge yüklenemedi. Lütfen tekrar dene.";
    }
  }

  return "Belge yüklenemedi. Lütfen tekrar dene.";
}

export function parseCloudinaryUploadResponse(payload: unknown): { ok: true } | { ok: false; message: string } {
  const body = payload as { error?: { message?: string }; secure_url?: string };

  if (body.error?.message) {
    return { ok: false, message: mapCloudinaryUploadError(new Error(body.error.message)) };
  }

  if (!body.secure_url) {
    return { ok: false, message: "Belge yüklenemedi. Lütfen tekrar dene." };
  }

  return { ok: true };
}

export type CloudinaryUploadResult = {
  status: number;
};

export async function uploadVerificationFileToCloudinary(
  file: VerificationUploadFile,
  intent: UploadIntentResponse,
): Promise<CloudinaryUploadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFICATION_UPLOAD_TIMEOUT_MS);

  let status: number | undefined;

  try {
    const response = await fetch(intent.uploadUrl, {
      method: "POST",
      body: buildVerificationUploadFormData(file, intent),
      signal: controller.signal,
    });

    status = response.status;

    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      secure_url?: string;
    };

    if (payload.error?.message) {
      throw new CloudinaryUploadError(
        mapCloudinaryUploadError(new Error(payload.error.message)),
        sanitizeCloudinaryClientMessage(payload.error.message),
        status,
      );
    }

    if (!response.ok) {
      throw new CloudinaryUploadError(
        "Belge yüklenemedi. Lütfen tekrar dene.",
        `cloudinary responded with status ${status}`,
        status,
      );
    }

    if (!payload.secure_url) {
      throw new CloudinaryUploadError(
        "Belge yüklenemedi. Lütfen tekrar dene.",
        "cloudinary response missing secure_url",
        status,
      );
    }

    return { status };
  } catch (error) {
    if (error instanceof CloudinaryUploadError) {
      throw error;
    }

    const sanitized =
      error instanceof Error ? sanitizeCloudinaryClientMessage(error.message) : "unknown error";
    throw new CloudinaryUploadError(mapCloudinaryUploadError(error), sanitized, status);
  } finally {
    clearTimeout(timeout);
  }
}
