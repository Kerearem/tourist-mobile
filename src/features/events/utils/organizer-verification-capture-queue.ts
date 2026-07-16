import type { VerificationDocumentType } from "../types/organizer";

export type PendingGuidedCapture = {
  documentType: VerificationDocumentType;
  uri: string;
};

/**
 * Pure queue policy for guided-camera captureResult uploads.
 *
 * Bug context: clearing captureResult then calling handleUpload while
 * activeUploadType !== null silently no-ops — the second identity (BACK)
 * capture was dropped. We keep at most one pending capture and only start
 * an upload when idle.
 */
export function planGuidedCaptureUpload(input: {
  activeUploadType: VerificationDocumentType | null;
  pending: PendingGuidedCapture | null;
  incoming: PendingGuidedCapture | null;
}): {
  nextPending: PendingGuidedCapture | null;
  startUpload: PendingGuidedCapture | null;
} {
  const pending = input.incoming ?? input.pending;

  if (!pending) {
    return { nextPending: null, startUpload: null };
  }

  if (input.activeUploadType !== null) {
    return { nextPending: pending, startUpload: null };
  }

  return { nextPending: null, startUpload: pending };
}
