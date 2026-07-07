import type { UploadIntentResponse, VerificationUploadFile } from "../../features/events/types/organizer";

export const VERIFICATION_UPLOAD_TIMEOUT_MS = 60_000;

export type VerificationUploadFormDataEntry = {
  name: string;
  value: string;
};

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
      return "Belge yükleme zaman aşımına uğradı. Lütfen tekrar dene.";
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

export async function uploadVerificationFileToCloudinary(
  file: VerificationUploadFile,
  intent: UploadIntentResponse,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFICATION_UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(intent.uploadUrl, {
      method: "POST",
      body: buildVerificationUploadFormData(file, intent),
      signal: controller.signal,
    });

    const payload = (await response.json()) as unknown;
    const parsed = parseCloudinaryUploadResponse(payload);

    if (!parsed.ok) {
      throw new Error(parsed.message);
    }

    if (!response.ok) {
      throw new Error(mapCloudinaryUploadError(new Error("Cloudinary upload failed")));
    }
  } catch (error) {
    throw new Error(mapCloudinaryUploadError(error));
  } finally {
    clearTimeout(timeout);
  }
}
