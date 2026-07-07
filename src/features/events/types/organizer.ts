import type { OrganizerStatus } from "../../../models/user";

export type OrganizerApplicationType = "INDIVIDUAL" | "BUSINESS";

export type OrganizerReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type OrganizerApplicationLegacyStatus = "NOT_APPLIED" | "PENDING" | "APPROVED" | "REJECTED";

export type VerificationDocumentType =
  | "IDENTITY_FRONT"
  | "IDENTITY_BACK"
  | "SELFIE"
  | "TAX_DOCUMENT"
  | "BUSINESS_REGISTRATION"
  | "AUTHORIZED_SIGNATORY";

export type VerificationDocumentStatus =
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REUPLOAD_REQUESTED";

export type DocumentChecklistItem = {
  documentType: VerificationDocumentType;
  required: boolean;
  latestDocumentId: string | null;
  latestStatus: VerificationDocumentStatus | null;
  latestVersion: number | null;
  satisfied: boolean;
};

export type OrganizerApplicationSummary = {
  id: string;
  type: OrganizerApplicationType;
  reviewStatus: OrganizerReviewStatus;
  status: OrganizerApplicationLegacyStatus | string;
  reason: string | null;
  changeRequestReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurrentOrganizerApplicationResponse = {
  application: OrganizerApplicationSummary | null;
  documentChecklist: DocumentChecklistItem[];
};

export type CreateOrganizerDraftInput = {
  type: OrganizerApplicationType;
  reason: string;
};

export type OrganizerDraftResponse = {
  application: Omit<OrganizerApplicationSummary, "status" | "changeRequestReason"> & {
    status?: OrganizerApplicationLegacyStatus | string;
    changeRequestReason?: string | null;
  };
  documentChecklist: DocumentChecklistItem[];
};

export type CreateUploadIntentInput = {
  documentType: VerificationDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type UploadIntentFormFields = {
  api_key: string;
  timestamp: string;
  signature: string;
  public_id: string;
  type: "authenticated";
  overwrite: "false";
};

export type UploadIntentResponse = {
  intentId: string;
  uploadUrl: string;
  expiresAt: string;
  resourceType: "image";
  fields: UploadIntentFormFields;
};

export type VerificationUploadFile = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type VerificationDocumentMetadata = {
  id: string;
  documentType: VerificationDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: VerificationDocumentStatus;
  version: number;
  replacesDocumentId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinalizeVerificationUploadResponse = {
  document: VerificationDocumentMetadata;
  documentChecklist: DocumentChecklistItem[];
};

export type SubmitOrganizerApplicationResponse = CurrentOrganizerApplicationResponse;

/** @deprecated Legacy single-step apply flow */
export type OrganizerApplicationInfo = {
  id: string;
  reason?: string;
  status: OrganizerStatus;
  type: string;
  createdAt: string;
};

export type OrganizerStatusResponse = {
  organizerStatus: OrganizerStatus;
  application?: OrganizerApplicationInfo;
  hasActiveEvent?: boolean;
  activeEventTitle?: string;
};

/** @deprecated Legacy single-step apply flow */
export type ApplyOrganizerInput = {
  reason: string;
};
