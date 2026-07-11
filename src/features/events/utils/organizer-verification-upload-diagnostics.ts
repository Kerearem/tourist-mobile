import { ApiRequestError } from "../../../services/api/apiRequestError";

export type VerificationUploadStep = "createIntent" | "uploadCloudinary" | "finalize";

export type VerificationUploadDiagnostic = {
  step: VerificationUploadStep;
  documentType?: string;
  mimeType?: string;
  sizeBytes?: number;
  resourceType?: string;
  status?: number;
  message?: string;
};

/**
 * Strips signed fields, signatures, public IDs, and any URLs so diagnostics are safe to log.
 */
export function sanitizeUploadDiagnosticMessage(message: string): string {
  return message
    .replace(/signature[=:]\S+/gi, "[redacted]")
    .replace(/api[_-]?key[=:]\S+/gi, "[redacted]")
    .replace(/api[_-]?secret[=:]\S+/gi, "[redacted]")
    .replace(/public[_-]?id[=:]\S+/gi, "[redacted]")
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .trim();
}

declare const __DEV__: boolean | undefined;

const isDevEnvironment = (): boolean => typeof __DEV__ !== "undefined" && __DEV__ === true;

export function logVerificationUploadDiagnostic(entry: VerificationUploadDiagnostic): void {
  if (!isDevEnvironment()) {
    return;
  }

  const safe: VerificationUploadDiagnostic = {
    step: entry.step,
    documentType: entry.documentType,
    mimeType: entry.mimeType,
    sizeBytes: entry.sizeBytes,
    resourceType: entry.resourceType,
    status: entry.status,
    message: entry.message ? sanitizeUploadDiagnosticMessage(entry.message) : undefined,
  };

  // eslint-disable-next-line no-console
  console.warn("[verification-upload]", JSON.stringify(safe));
}

export class VerificationUploadStepError extends Error {
  readonly step: VerificationUploadStep;
  readonly status?: number;

  constructor(step: VerificationUploadStep, message: string, status?: number) {
    super(message);
    this.name = "VerificationUploadStepError";
    this.step = step;
    this.status = status;
  }
}

export function resolveErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiRequestError) {
    return error.status;
  }

  return undefined;
}

/**
 * Maps a step-tagged upload failure to a specific Turkish user message.
 * Falls back to a controlled generic message; never leaks sensitive data.
 */
export function mapVerificationUploadStepError(error: unknown): string {
  if (error instanceof VerificationUploadStepError) {
    const message = error.message.trim();
    const isGenericServerError =
      !message || /^internal server error$/i.test(message) || (error.status ?? 0) >= 500;

    if (error.step === "createIntent") {
      if (!isGenericServerError) {
        return message;
      }
      return "Belge yükleme başlatılamadı. Lütfen tekrar dene.";
    }

    if (error.step === "uploadCloudinary") {
      if (message) {
        return message;
      }
      return "Belge sunucuya yüklenemedi. Lütfen tekrar dene.";
    }

    // finalize
    if (!isGenericServerError) {
      return message;
    }
    return "Belge doğrulanamadı. Lütfen tekrar dene.";
  }

  if (error instanceof ApiRequestError) {
    const message = error.message.trim();
    if (message && !/^internal server error$/i.test(message) && error.status < 500) {
      return message;
    }
    return "Belge yüklenemedi. Lütfen tekrar dene.";
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !/^internal server error$/i.test(message)) {
      return message;
    }
  }

  return "Belge yüklenemedi. Lütfen tekrar dene.";
}
