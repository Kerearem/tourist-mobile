import type { FinalizeVerificationUploadResponse, UploadIntentResponse } from "../types/organizer";
import { isUploadIntentExpired } from "./organizer-verification";

export type VerificationUploadOrchestrationDeps = {
  createIntent: () => Promise<UploadIntentResponse>;
  uploadToCloudinary: (intent: UploadIntentResponse) => Promise<void>;
  finalize: (intentId: string) => Promise<FinalizeVerificationUploadResponse>;
  nowMs?: () => number;
};

export async function orchestrateVerificationUpload(
  deps: VerificationUploadOrchestrationDeps,
): Promise<FinalizeVerificationUploadResponse> {
  const nowMs = deps.nowMs ?? (() => Date.now());

  let intent = await deps.createIntent();
  if (isUploadIntentExpired(intent.expiresAt, nowMs())) {
    intent = await deps.createIntent();
  }

  await deps.uploadToCloudinary(intent);

  try {
    return await deps.finalize(intent.intentId);
  } catch (firstFinalizeError) {
    if (!isUploadIntentExpired(intent.expiresAt, nowMs())) {
      return await deps.finalize(intent.intentId);
    }

    const freshIntent = await deps.createIntent();
    await deps.uploadToCloudinary(freshIntent);
    return await deps.finalize(freshIntent.intentId);
  }
}
