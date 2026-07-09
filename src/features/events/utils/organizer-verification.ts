import type { AccountType, OrganizerStatus } from "../../../models/user";
import type {
  DocumentChecklistItem,
  OrganizerApplicationType,
  OrganizerReviewStatus,
  VerificationDocumentStatus,
  VerificationDocumentType,
  VerificationUploadFile,
} from "../types/organizer";

export const VERIFICATION_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const VERIFICATION_ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export const VERIFICATION_ALLOWED_SELFIE_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export const DOCUMENT_TYPE_LABELS: Record<VerificationDocumentType, string> = {
  IDENTITY_FRONT: "Kimlik ön yüz",
  IDENTITY_BACK: "Kimlik arka yüz",
  SELFIE: "Canlılık/selfie",
  TAX_DOCUMENT: "Vergi belgesi",
  BUSINESS_REGISTRATION: "İşletme tescil belgesi",
  AUTHORIZED_SIGNATORY: "Yetkili imza belgesi",
};

export const DOCUMENT_STATUS_LABELS: Record<VerificationDocumentStatus, string> = {
  UPLOADED: "Yüklendi",
  UNDER_REVIEW: "İnceleniyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  REUPLOAD_REQUESTED: "Yeniden yükleme istendi",
};

const SUBMIT_READY_STATUSES: VerificationDocumentStatus[] = [
  "UPLOADED",
  "UNDER_REVIEW",
  "APPROVED",
];

const BLOCKING_SUBMIT_STATUSES: VerificationDocumentStatus[] = [
  "REJECTED",
  "REUPLOAD_REQUESTED",
];

export type OrganizerScreenPhase =
  | "approved"
  | "read_only"
  | "changes_requested"
  | "draft_info"
  | "draft_documents"
  | "legacy_submitted_completion";

export type OrganizerDraftStep = "info" | "documents";

export type OrganizerScreenPhaseInput = {
  organizerStatus: OrganizerStatus;
  reviewStatus: OrganizerReviewStatus | null;
  checklist: DocumentChecklistItem[];
};

export function resolveApplicationTypeForAccount(accountType: AccountType): OrganizerApplicationType {
  return accountType === "business" ? "BUSINESS" : "INDIVIDUAL";
}

export function isDraftBlockedByAge(
  applicationType: OrganizerApplicationType,
  birthDate: string | undefined | null,
  meetsMinimumAge: (birthDate: string | undefined | null) => boolean,
): boolean {
  if (applicationType === "BUSINESS") {
    return false;
  }

  return !meetsMinimumAge(birthDate);
}

export function canStartDocumentUpload(activeUploadType: VerificationDocumentType | null): boolean {
  return activeUploadType === null;
}

export function toDocumentCardReviewStatus(
  reviewStatus: OrganizerReviewStatus,
): "DRAFT" | "CHANGES_REQUESTED" | "SUBMITTED" | "UNDER_REVIEW" {
  if (reviewStatus === "UNDER_REVIEW") {
    return "UNDER_REVIEW";
  }

  if (reviewStatus === "CHANGES_REQUESTED") {
    return "CHANGES_REQUESTED";
  }

  if (reviewStatus === "SUBMITTED") {
    return "SUBMITTED";
  }

  return "DRAFT";
}

export function isPendingOrganizerApplicationNavigable(organizerStatus: OrganizerStatus): boolean {
  return organizerStatus === "pending";
}

export function isReadOnlyReviewStatus(reviewStatus: OrganizerReviewStatus): boolean {
  return reviewStatus === "SUBMITTED" || reviewStatus === "UNDER_REVIEW";
}

export function isMissingRequiredDocument(item: DocumentChecklistItem): boolean {
  return item.required && (!item.latestDocumentId || !item.latestStatus);
}

export function hasRequiredDocumentsPresent(checklist: DocumentChecklistItem[]): boolean {
  const requiredItems = checklist.filter((item) => item.required);
  if (requiredItems.length === 0) {
    return false;
  }

  return requiredItems.every(isChecklistItemSubmitReady);
}

export function isChecklistItemSubmitReady(item: DocumentChecklistItem): boolean {
  if (!item.latestDocumentId || !item.latestStatus) {
    return false;
  }

  if (BLOCKING_SUBMIT_STATUSES.includes(item.latestStatus)) {
    return false;
  }

  return SUBMIT_READY_STATUSES.includes(item.latestStatus);
}

export function isChecklistItemComplete(item: DocumentChecklistItem): boolean {
  return isChecklistItemSubmitReady(item);
}

export function canUploadChecklistItem(
  item: DocumentChecklistItem,
  reviewStatus: OrganizerReviewStatus,
): boolean {
  if (reviewStatus === "UNDER_REVIEW") {
    return false;
  }

  if (reviewStatus === "DRAFT") {
    return true;
  }

  if (reviewStatus === "CHANGES_REQUESTED") {
    return (
      item.latestStatus === "REJECTED" ||
      item.latestStatus === "REUPLOAD_REQUESTED" ||
      isMissingRequiredDocument(item)
    );
  }

  if (reviewStatus === "SUBMITTED") {
    return isMissingRequiredDocument(item);
  }

  return false;
}

/** @deprecated Use canUploadChecklistItem */
export function canReuploadChecklistItem(
  item: DocumentChecklistItem,
  reviewStatus: OrganizerReviewStatus,
): boolean {
  return canUploadChecklistItem(item, reviewStatus);
}

export function canUploadDocuments(reviewStatus: OrganizerReviewStatus): boolean {
  return reviewStatus === "DRAFT" || reviewStatus === "CHANGES_REQUESTED" || reviewStatus === "SUBMITTED";
}

export function isDocumentsPhase(screenPhase: OrganizerScreenPhase): boolean {
  return (
    screenPhase === "draft_documents" ||
    screenPhase === "changes_requested" ||
    screenPhase === "legacy_submitted_completion"
  );
}

export function resolveOrganizerScreenPhase(input: OrganizerScreenPhaseInput): OrganizerScreenPhase {
  if (input.organizerStatus === "approved") {
    return "approved";
  }

  if (input.reviewStatus === "UNDER_REVIEW") {
    return "read_only";
  }

  if (input.reviewStatus === "SUBMITTED") {
    return hasRequiredDocumentsPresent(input.checklist)
      ? "read_only"
      : "legacy_submitted_completion";
  }

  if (input.organizerStatus === "pending" && input.reviewStatus === null) {
    return "read_only";
  }

  if (input.reviewStatus === "CHANGES_REQUESTED") {
    return "changes_requested";
  }

  if (input.reviewStatus === "DRAFT") {
    return "draft_documents";
  }

  return "draft_info";
}

export function resolveInitialDraftStep(input: OrganizerScreenPhaseInput): OrganizerDraftStep {
  return isDocumentsPhase(resolveOrganizerScreenPhase(input)) ? "documents" : "info";
}

export function shouldShowDraftSubmit(screenPhase: OrganizerScreenPhase): boolean {
  return screenPhase === "draft_documents";
}

export function shouldShowResubmit(screenPhase: OrganizerScreenPhase): boolean {
  return screenPhase === "changes_requested";
}

export type SaveOrganizerDraftInfoInput = {
  screenPhase: OrganizerScreenPhase;
  reviewStatus: OrganizerReviewStatus | null;
  draftStep: OrganizerDraftStep;
};

const BLOCKED_DRAFT_INFO_REVIEW_STATUSES: OrganizerReviewStatus[] = [
  "CHANGES_REQUESTED",
  "SUBMITTED",
  "UNDER_REVIEW",
];

export function canSaveOrganizerDraftInfo(input: SaveOrganizerDraftInfoInput): boolean {
  if (input.draftStep !== "info") {
    return false;
  }

  if (
    input.reviewStatus &&
    BLOCKED_DRAFT_INFO_REVIEW_STATUSES.includes(input.reviewStatus)
  ) {
    return false;
  }

  if (input.screenPhase === "draft_info") {
    return true;
  }

  if (input.reviewStatus === "DRAFT") {
    return true;
  }

  return false;
}

export function canEditOrganizerDraftMotivation(input: {
  reviewStatus: OrganizerReviewStatus | null;
  screenPhase: OrganizerScreenPhase;
}): boolean {
  return input.reviewStatus === "DRAFT" && input.screenPhase === "draft_documents";
}

export function mergeDraftUpdateChecklist(
  previousChecklist: DocumentChecklistItem[],
  nextChecklist: DocumentChecklistItem[],
): DocumentChecklistItem[] {
  if (nextChecklist.length === 0 && previousChecklist.length > 0) {
    return previousChecklist;
  }

  return nextChecklist;
}

export function getChecklistItemDisplayStatus(item: DocumentChecklistItem): string {
  if (!item.latestDocumentId || !item.latestStatus) {
    return "Eksik";
  }

  return DOCUMENT_STATUS_LABELS[item.latestStatus];
}

export function isSubmitEligible(checklist: DocumentChecklistItem[]): boolean {
  const requiredItems = checklist.filter((item) => item.required);
  if (requiredItems.length === 0) {
    return false;
  }

  return requiredItems.every(isChecklistItemSubmitReady);
}

export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

export function isAllowedMimeTypeForDocument(
  documentType: VerificationDocumentType,
  mimeType: string,
): boolean {
  const normalized = normalizeMimeType(mimeType);

  if (documentType === "SELFIE") {
    return (VERIFICATION_ALLOWED_SELFIE_MIME_TYPES as readonly string[]).includes(normalized);
  }

  return (VERIFICATION_ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(normalized);
}

export function validateVerificationUploadFile(
  file: VerificationUploadFile,
  documentType: VerificationDocumentType,
): string | null {
  if (!file.uri.trim()) {
    return "Dosya seçilemedi.";
  }

  if (!file.name.trim()) {
    return "Dosya adı okunamadı.";
  }

  if (file.sizeBytes <= 0) {
    return "Dosya boyutu okunamadı. Lütfen dosyayı yeniden seç.";
  }

  if (file.sizeBytes > VERIFICATION_MAX_FILE_BYTES) {
    return "Dosya boyutu en fazla 10 MB olabilir.";
  }

  if (!isAllowedMimeTypeForDocument(documentType, file.mimeType)) {
    if (documentType === "SELFIE") {
      return "Selfie yalnızca JPEG veya PNG formatında olabilir.";
    }
    return "Yalnızca JPEG, PNG veya PDF dosyaları yüklenebilir.";
  }

  return null;
}

export function isUploadIntentExpired(expiresAt: string, nowMs = Date.now()): boolean {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) {
    return true;
  }

  return expiresMs <= nowMs;
}

export type UploadRetryDecision =
  | { action: "new_intent" }
  | { action: "retry_finalize"; intent: { intentId: string; expiresAt: string } }
  | { action: "reupload_and_finalize" }
  | { action: "fail"; message: string };

export function resolveUploadRetryDecision(input: {
  cloudinarySucceeded: boolean;
  finalizeError?: unknown;
  intent: { intentId: string; expiresAt: string };
  nowMs?: number;
}): UploadRetryDecision {
  if (!input.cloudinarySucceeded) {
    return { action: "new_intent" };
  }

  if (isUploadIntentExpired(input.intent.expiresAt, input.nowMs)) {
    return { action: "reupload_and_finalize" };
  }

  if (input.finalizeError) {
    return {
      action: "retry_finalize",
      intent: input.intent,
    };
  }

  return { action: "fail", message: "Belge yüklemesi tamamlanamadı." };
}
