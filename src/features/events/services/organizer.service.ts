import type {
  ApplyOrganizerInput,
  CreateOrganizerDraftInput,
  CreateUploadIntentInput,
  CurrentOrganizerApplicationResponse,
  FinalizeVerificationUploadResponse,
  OrganizerDraftResponse,
  OrganizerStatusResponse,
  SubmitOrganizerApplicationResponse,
  UploadIntentResponse,
  VerificationUploadFile,
} from "../types/organizer";
import type { EventItem } from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import {
  CloudinaryUploadError,
  uploadVerificationFileToCloudinary,
} from "../../../services/media/cloudinary-verification";
import {
  createMockOrganizerDraft,
  createMockUploadIntent,
  finalizeMockUploadIntent,
  getMockCurrentOrganizerApplication,
  getMockOrganizerStatusResponse,
  submitMockOrganizerApplication,
} from "./organizer-mock-state";
import { orchestrateVerificationUpload } from "../utils/organizer-verification-upload";
import {
  normalizeOrganizerCapabilityStatus,
  type NormalizedOrganizerCapabilityStatus,
} from "../utils/organizerCapabilityStatus";
import {
  normalizeCurrentOrganizerApplicationResponse,
  normalizeVerificationUploadFileMetadata,
} from "../utils/organizer-verification";
import {
  logVerificationUploadDiagnostic,
  resolveErrorStatus,
  sanitizeUploadDiagnosticMessage,
  VerificationUploadStepError,
} from "../utils/organizer-verification-upload-diagnostics";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

const withApplicationIdParam = (template: string, applicationId: string) =>
  template.replace(":applicationId", applicationId);

const withUserIdParam = (template: string, userId: string) => template.replace(":userId", userId);

export async function getOrganizerStatus(): Promise<NormalizedOrganizerCapabilityStatus> {
  if (USE_MOCK_BACKEND) {
    const current = getMockCurrentOrganizerApplication();
    const baseResponse = getMockOrganizerStatusResponse();

    if (
      current.application?.reviewStatus === "SUBMITTED" ||
      current.application?.reviewStatus === "UNDER_REVIEW"
    ) {
      return normalizeOrganizerCapabilityStatus({
        ...baseResponse,
        organizerStatus: "pending",
        application: current.application
          ? {
              id: current.application.id,
              reason: current.application.reason ?? undefined,
              status: "pending",
              type: current.application.type.toLowerCase(),
              createdAt: current.application.createdAt,
            }
          : undefined,
      });
    }

    if (current.application?.reviewStatus === "DRAFT") {
      return normalizeOrganizerCapabilityStatus({
        ...baseResponse,
        organizerStatus: "not_applied",
      });
    }

    return normalizeOrganizerCapabilityStatus(baseResponse);
  }

  const token = await getAccessToken();
  const raw = await apiRequest<OrganizerStatusResponse>(API_ENDPOINTS.organizer.status, {
    method: "GET",
    token,
  });

  return normalizeOrganizerCapabilityStatus(raw);
}

export async function getCurrentOrganizerApplication(): Promise<CurrentOrganizerApplicationResponse> {
  if (USE_MOCK_BACKEND) {
    return getMockCurrentOrganizerApplication();
  }

  const token = await getAccessToken();
  const raw = await apiRequest<CurrentOrganizerApplicationResponse>(
    API_ENDPOINTS.organizer.applications.current,
    {
      method: "GET",
      token,
    },
  );

  return normalizeCurrentOrganizerApplicationResponse(raw);
}

export async function createOrUpdateOrganizerDraft(
  input: CreateOrganizerDraftInput,
): Promise<OrganizerDraftResponse> {
  if (USE_MOCK_BACKEND) {
    return createMockOrganizerDraft(input);
  }

  const token = await getAccessToken();
  return apiRequest<OrganizerDraftResponse>(API_ENDPOINTS.organizer.applications.draft, {
    method: "POST",
    token,
    body: input,
  });
}

export async function createVerificationUploadIntent(
  applicationId: string,
  input: CreateUploadIntentInput,
): Promise<UploadIntentResponse> {
  if (USE_MOCK_BACKEND) {
    return createMockUploadIntent({ documentType: input.documentType });
  }

  const token = await getAccessToken();
  return apiRequest<UploadIntentResponse>(
    withApplicationIdParam(API_ENDPOINTS.organizer.applications.uploadIntent, applicationId),
    {
      method: "POST",
      token,
      body: input,
    },
  );
}

export async function uploadVerificationFileToCloudinaryWithIntent(
  file: VerificationUploadFile,
  intent: UploadIntentResponse,
): Promise<void> {
  if (USE_MOCK_BACKEND) {
    return;
  }

  await uploadVerificationFileToCloudinary(file, intent);
}

export async function finalizeVerificationUpload(
  applicationId: string,
  intentId: string,
): Promise<FinalizeVerificationUploadResponse> {
  if (USE_MOCK_BACKEND) {
    return finalizeMockUploadIntent(intentId);
  }

  const token = await getAccessToken();
  return apiRequest<FinalizeVerificationUploadResponse>(
    withApplicationIdParam(API_ENDPOINTS.organizer.applications.finalize, applicationId),
    {
      method: "POST",
      token,
      body: { intentId },
    },
  );
}

export async function uploadVerificationDocument(
  applicationId: string,
  file: VerificationUploadFile,
  input: CreateUploadIntentInput,
): Promise<FinalizeVerificationUploadResponse> {
  const normalizedFile = normalizeVerificationUploadFileMetadata(
    {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
    input.documentType,
  );

  const diagnosticBase = {
    documentType: input.documentType,
    mimeType: normalizedFile.mimeType,
    sizeBytes: normalizedFile.sizeBytes,
  };
  let finalizeAttempt = 0;

  return orchestrateVerificationUpload({
    createIntent: async () => {
      if (USE_MOCK_BACKEND) {
        return createMockUploadIntent({ documentType: input.documentType });
      }

      try {
        return await createVerificationUploadIntent(applicationId, {
          ...input,
          originalFileName: normalizedFile.name,
          mimeType: normalizedFile.mimeType,
          sizeBytes: normalizedFile.sizeBytes,
        });
      } catch (error) {
        const status = resolveErrorStatus(error);
        const message = error instanceof Error ? error.message : "createIntent failed";
        logVerificationUploadDiagnostic({
          step: "createIntent",
          ...diagnosticBase,
          status,
          message,
        });
        throw new VerificationUploadStepError("createIntent", message, status);
      }
    },
    uploadToCloudinary: async (intent) => {
      if (USE_MOCK_BACKEND) {
        return;
      }

      try {
        const result = await uploadVerificationFileToCloudinary(normalizedFile, intent);
        logVerificationUploadDiagnostic({
          step: "uploadCloudinary",
          ...diagnosticBase,
          resourceType: intent.resourceType,
          status: result.status,
        });
      } catch (error) {
        if (error instanceof CloudinaryUploadError) {
          logVerificationUploadDiagnostic({
            step: "uploadCloudinary",
            ...diagnosticBase,
            resourceType: intent.resourceType,
            status: error.status,
            message: error.sanitizedMessage,
          });
          throw new VerificationUploadStepError("uploadCloudinary", error.message, error.status);
        }

        const message = error instanceof Error ? error.message : "uploadCloudinary failed";
        logVerificationUploadDiagnostic({
          step: "uploadCloudinary",
          ...diagnosticBase,
          resourceType: intent.resourceType,
          message: sanitizeUploadDiagnosticMessage(message),
        });
        throw new VerificationUploadStepError("uploadCloudinary", message);
      }
    },
    finalize: async (intentId) => {
      if (USE_MOCK_BACKEND) {
        return finalizeMockUploadIntent(intentId);
      }

      finalizeAttempt += 1;
      const attempt = finalizeAttempt;

      logVerificationUploadDiagnostic({
        step: "finalize",
        phase: "start",
        attempt,
        ...diagnosticBase,
      });

      try {
        const result = await finalizeVerificationUpload(applicationId, intentId);
        logVerificationUploadDiagnostic({
          step: "finalize",
          phase: "success",
          attempt,
          status: 200,
          ...diagnosticBase,
        });
        return result;
      } catch (error) {
        const status = resolveErrorStatus(error);
        const message = error instanceof Error ? error.message : "finalize failed";
        logVerificationUploadDiagnostic({
          step: "finalize",
          phase: "failure",
          attempt,
          ...diagnosticBase,
          status,
          message,
        });
        throw new VerificationUploadStepError("finalize", message, status);
      }
    },
  });
}

export async function submitOrganizerApplication(
  applicationId: string,
): Promise<SubmitOrganizerApplicationResponse> {
  if (USE_MOCK_BACKEND) {
    return submitMockOrganizerApplication();
  }

  const token = await getAccessToken();
  return apiRequest<SubmitOrganizerApplicationResponse>(
    withApplicationIdParam(API_ENDPOINTS.organizer.applications.submit, applicationId),
    {
      method: "POST",
      token,
    },
  );
}

/** @deprecated Legacy single-step apply flow */
export async function applyForOrganizer(input: ApplyOrganizerInput): Promise<NormalizedOrganizerCapabilityStatus> {
  if (USE_MOCK_BACKEND) {
    return normalizeOrganizerCapabilityStatus({
      ...getMockOrganizerStatusResponse(),
      organizerStatus: "pending",
    });
  }

  const token = await getAccessToken();
  const raw = await apiRequest<OrganizerStatusResponse>(API_ENDPOINTS.organizer.apply, {
    method: "POST",
    token,
    body: input,
  });

  return normalizeOrganizerCapabilityStatus(raw);
}

export async function getMyOrganizerEvents(): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(API_ENDPOINTS.organizer.myEvents, {
    method: "GET",
    token,
  });
}

export async function getOrganizerPublicEvents(userId: string): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(withUserIdParam(API_ENDPOINTS.users.organizerEvents, userId), {
    method: "GET",
    token,
  });
}

export async function getMyAttendedEvents(): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(API_ENDPOINTS.events.myAttendances, {
    method: "GET",
    token,
  });
}

export async function getUserAttendedEvents(userId: string): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(withUserIdParam(API_ENDPOINTS.users.userAttendances, userId), {
    method: "GET",
    token,
  });
}
