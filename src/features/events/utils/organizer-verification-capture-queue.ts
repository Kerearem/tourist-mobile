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
  /**
   * False while the screen has not loaded the draft application yet (e.g. right
   * after a remount when returning from the capture screen). Captures must wait
   * for the application id instead of being dropped by the upload guard.
   */
  hasApplication: boolean;
}): {
  nextPending: PendingGuidedCapture | null;
  startUpload: PendingGuidedCapture | null;
} {
  const pending = input.incoming ?? input.pending;

  if (!pending) {
    return { nextPending: null, startUpload: null };
  }

  if (input.activeUploadType !== null || !input.hasApplication) {
    return { nextPending: pending, startUpload: null };
  }

  return { nextPending: null, startUpload: pending };
}
