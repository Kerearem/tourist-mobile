import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockOrganizerDraft,
  createMockUploadIntent,
  finalizeMockUploadIntent,
  getMockCurrentOrganizerApplication,
  resetOrganizerVerificationMockState,
  submitMockOrganizerApplication,
} from "../src/features/events/services/organizer-mock-state";
import type { DocumentChecklistItem, UploadIntentResponse, VerificationUploadFile } from "../src/features/events/types/organizer";
import {
  canProceedFromDocumentStep,
  findFirstIncompleteDocumentStep,
  getRequiredDocumentTypes,
  getWizardSteps,
  isWizardSubmitEnabled,
  resolveInitialWizardStep,
  validateOrganizerMotivation,
} from "../src/features/events/utils/organizer-verification-wizard";
import {
  buildVerificationUploadFormEntries,
  parseCloudinaryUploadResponse,
} from "../src/services/media/cloudinary-verification";
import { orchestrateVerificationUpload } from "../src/features/events/utils/organizer-verification-upload";
import {
  canUploadChecklistItem,
  canEditOrganizerDraftMotivation,
  canSaveOrganizerDraftInfo,
  canStartDocumentUpload,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  hasRequiredDocumentsPresent,
  isDraftBlockedByAge,
  isChecklistItemComplete,
  isChecklistItemSubmitReady,
  isPendingOrganizerApplicationNavigable,
  isReadOnlyReviewStatus,
  isSubmitEligible,
  isUploadIntentExpired,
  mergeDraftUpdateChecklist,
  resolveApplicationTypeForAccount,
  resolveInitialDraftStep,
  resolveOrganizerScreenPhase,
  resolveUploadRetryDecision,
  toDocumentCardReviewStatus,
  validateVerificationUploadFile,
  VERIFICATION_MAX_FILE_BYTES,
} from "../src/features/events/utils/organizer-verification";

const sampleFile = (overrides?: Partial<VerificationUploadFile>): VerificationUploadFile => ({
  uri: "file:///tmp/kimlik.jpg",
  name: "kimlik.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  ...overrides,
});

const sampleIntent = (id: string, expiresAt: string): UploadIntentResponse => ({
  intentId: id,
  uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
  expiresAt,
  resourceType: "image",
  fields: {
    api_key: "key",
    timestamp: "123",
    signature: "signed",
    public_id: `tourist/verification/test/doc_${id}`,
    type: "authenticated",
    overwrite: "false",
  },
});

const buildChecklist = (statuses: Array<DocumentChecklistItem["latestStatus"]>): DocumentChecklistItem[] =>
  ["IDENTITY_FRONT", "IDENTITY_BACK", "SELFIE"].map((documentType, index) => ({
    documentType: documentType as DocumentChecklistItem["documentType"],
    required: true,
    latestDocumentId: statuses[index] ? `doc-${index + 1}` : null,
    latestStatus: statuses[index] ?? null,
    latestVersion: statuses[index] ? 1 : null,
    satisfied: statuses[index] === "APPROVED",
  }));

const emptyChecklist = buildChecklist([null, null, null]);
const completeChecklist = buildChecklist(["UPLOADED", "UPLOADED", "UPLOADED"]);

const phaseInput = (
  reviewStatus: DocumentChecklistItem extends never ? never : NonNullable<Parameters<typeof resolveOrganizerScreenPhase>[0]["reviewStatus"]>,
  checklist: DocumentChecklistItem[] = emptyChecklist,
  organizerStatus: "not_applied" | "pending" | "approved" | "rejected" = "pending",
) => ({
  organizerStatus,
  reviewStatus,
  checklist,
});

test("maps backend document types and statuses to Turkish labels", () => {
  assert.equal(DOCUMENT_TYPE_LABELS.IDENTITY_FRONT, "Kimlik ön yüz");
  assert.equal(DOCUMENT_TYPE_LABELS.SELFIE, "Canlılık/selfie");
  assert.equal(DOCUMENT_TYPE_LABELS.TAX_DOCUMENT, "Vergi belgesi");
  assert.equal(DOCUMENT_TYPE_LABELS.AUTHORIZED_SIGNATORY, "Yetkili imza belgesi");
  assert.equal(DOCUMENT_STATUS_LABELS.UPLOADED, "Yüklendi");
  assert.equal(DOCUMENT_STATUS_LABELS.REUPLOAD_REQUESTED, "Yeniden yükleme istendi");
});

test("resolves application type from account type", () => {
  assert.equal(resolveApplicationTypeForAccount("personal"), "INDIVIDUAL");
  assert.equal(resolveApplicationTypeForAccount("business"), "BUSINESS");
});

test("allows saving draft info for new applications and existing draft edits", () => {
  assert.equal(
    canSaveOrganizerDraftInfo({
      screenPhase: "draft_info",
      reviewStatus: null,
      draftStep: "info",
    }),
    true,
  );

  assert.equal(
    canSaveOrganizerDraftInfo({
      screenPhase: "draft_documents",
      reviewStatus: "DRAFT",
      draftStep: "info",
    }),
    true,
  );
});

test("blocks draft info save on documents step and non-draft review statuses", () => {
  assert.equal(
    canSaveOrganizerDraftInfo({
      screenPhase: "draft_documents",
      reviewStatus: "DRAFT",
      draftStep: "documents",
    }),
    false,
  );

  for (const reviewStatus of ["CHANGES_REQUESTED", "SUBMITTED", "UNDER_REVIEW"] as const) {
    assert.equal(
      canSaveOrganizerDraftInfo({
        screenPhase: "changes_requested",
        reviewStatus,
        draftStep: "info",
      }),
      false,
    );
  }
});

test("allows motivation edit only for draft documents phase", () => {
  assert.equal(
    canEditOrganizerDraftMotivation({ reviewStatus: "DRAFT", screenPhase: "draft_documents" }),
    true,
  );
  assert.equal(
    canEditOrganizerDraftMotivation({ reviewStatus: "CHANGES_REQUESTED", screenPhase: "changes_requested" }),
    false,
  );
});

test("preserves existing checklist when draft update response is empty", () => {
  const previous = completeChecklist;
  assert.deepEqual(mergeDraftUpdateChecklist(previous, []), previous);
  assert.deepEqual(mergeDraftUpdateChecklist(previous, completeChecklist), completeChecklist);
});

test("does not block business drafts by personal birth date", () => {
  assert.equal(isDraftBlockedByAge("BUSINESS", undefined, () => false), false);
  assert.equal(isDraftBlockedByAge("INDIVIDUAL", undefined, () => false), true);
  assert.equal(isDraftBlockedByAge("INDIVIDUAL", "2000-01-01", () => true), false);
});

test("allows submit when required documents are uploaded or under review", () => {
  assert.equal(isSubmitEligible(buildChecklist(["UPLOADED", "UNDER_REVIEW", "APPROVED"])), true);
});

test("blocks submit for missing rejected or reupload requested documents", () => {
  assert.equal(isSubmitEligible(buildChecklist([null, "UPLOADED", "UPLOADED"])), false);
  assert.equal(isSubmitEligible(buildChecklist(["REJECTED", "UPLOADED", "UPLOADED"])), false);
  assert.equal(isSubmitEligible(buildChecklist(["UPLOADED", "REUPLOAD_REQUESTED", "UPLOADED"])), false);
});

test("validates jpeg png and pdf and rejects selfie pdf", () => {
  assert.equal(validateVerificationUploadFile(sampleFile(), "IDENTITY_FRONT"), null);
  assert.equal(
    validateVerificationUploadFile(sampleFile({ mimeType: "application/pdf", name: "vergi.pdf" }), "TAX_DOCUMENT"),
    null,
  );
  assert.match(
    validateVerificationUploadFile(sampleFile({ mimeType: "application/pdf", name: "selfie.pdf" }), "SELFIE") ?? "",
    /Selfie yalnızca JPEG veya PNG/,
  );
});

test("rejects files over 10 MB", () => {
  assert.match(
    validateVerificationUploadFile(
      sampleFile({ sizeBytes: VERIFICATION_MAX_FILE_BYTES + 1 }),
      "IDENTITY_FRONT",
    ) ?? "",
    /10 MB/,
  );
});

test("builds form entries with backend fields only and overwrite false", () => {
  const intent = sampleIntent("intent-1", new Date(Date.now() + 60_000).toISOString());
  const entries = buildVerificationUploadFormEntries(sampleFile(), intent);

  assert.deepEqual(
    entries.map((entry) => entry.name),
    ["api_key", "timestamp", "signature", "public_id", "type", "overwrite"],
  );
  assert.equal(entries.find((entry) => entry.name === "folder"), undefined);
  assert.equal(entries.find((entry) => entry.name === "upload_preset"), undefined);
  assert.equal(entries.find((entry) => entry.name === "overwrite")?.value, "false");
});

test("does not persist cloudinary secure_url from upload response parsing", () => {
  const parsed = parseCloudinaryUploadResponse({
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/doc.jpg",
  });

  assert.equal(parsed.ok, true);
  assert.equal("secure_url" in parsed, false);
});

test("requests reupload when upload intent expired after cloudinary success", () => {
  const intent = { intentId: "intent-1", expiresAt: new Date(Date.now() - 1000).toISOString() };
  assert.equal(
    resolveUploadRetryDecision({
      cloudinarySucceeded: true,
      finalizeError: new Error("finalize failed"),
      intent,
    }).action,
    "reupload_and_finalize",
  );
  assert.equal(isUploadIntentExpired(intent.expiresAt), true);
});

test("retries finalize with same intent after cloudinary success when intent valid", () => {
  const intent = { intentId: "intent-1", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const decision = resolveUploadRetryDecision({
    cloudinarySucceeded: true,
    finalizeError: new Error("finalize failed"),
    intent,
  });

  assert.deepEqual(decision, { action: "retry_finalize", intent });
});

test("orchestrates expired intent with cloudinary reupload before second finalize", async () => {
  const calls: string[] = [];
  const now = Date.now();
  const validAt = new Date(now + 60_000).toISOString();
  let afterCloudinary = false;

  await orchestrateVerificationUpload({
    nowMs: () => (afterCloudinary ? now + 120_000 : now),
    createIntent: async () => {
      calls.push("createIntent");
      const count = calls.filter((call) => call === "createIntent").length;
      return sampleIntent(count === 1 ? "intent-1" : "intent-2", validAt);
    },
    uploadToCloudinary: async (intent) => {
      calls.push(`cloudinary:${intent.intentId}`);
      afterCloudinary = true;
    },
    finalize: async (intentId) => {
      calls.push(`finalize:${intentId}`);
      if (intentId === "intent-1") {
        throw new Error("finalize failed");
      }

      return {
        document: {
          id: "doc-1",
          documentType: "IDENTITY_FRONT",
          originalFileName: "kimlik.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          status: "UPLOADED",
          version: 1,
          replacesDocumentId: null,
          reviewNote: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        documentChecklist: completeChecklist,
      };
    },
  });

  assert.deepEqual(calls, [
    "createIntent",
    "cloudinary:intent-1",
    "finalize:intent-1",
    "createIntent",
    "cloudinary:intent-2",
    "finalize:intent-2",
  ]);
});

test("orchestrates same intent finalize retry without second cloudinary upload", async () => {
  const calls: string[] = [];
  const validAt = new Date(Date.now() + 60_000).toISOString();

  await orchestrateVerificationUpload({
    createIntent: async () => {
      calls.push("createIntent");
      return sampleIntent("intent-1", validAt);
    },
    uploadToCloudinary: async () => {
      calls.push("cloudinary:intent-1");
    },
    finalize: async (intentId) => {
      calls.push(`finalize:${intentId}`);
      if (calls.filter((call) => call.startsWith("finalize:")).length === 1) {
        throw new Error("temporary finalize failure");
      }

      return {
        document: {
          id: "doc-1",
          documentType: "IDENTITY_FRONT",
          originalFileName: "kimlik.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          status: "UPLOADED",
          version: 1,
          replacesDocumentId: null,
          reviewNote: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        documentChecklist: completeChecklist,
      };
    },
  });

  assert.deepEqual(calls, ["createIntent", "cloudinary:intent-1", "finalize:intent-1", "finalize:intent-1"]);
});

test("opens documents step for changes requested without draft info step", () => {
  const input = phaseInput("CHANGES_REQUESTED", buildChecklist(["UPLOADED", "REJECTED", "UPLOADED"]));
  assert.equal(resolveOrganizerScreenPhase(input), "changes_requested");
  assert.equal(resolveInitialDraftStep(input), "documents");
});

test("uses legacy submitted completion when required documents are missing", () => {
  const input = phaseInput("SUBMITTED", emptyChecklist);
  assert.equal(resolveOrganizerScreenPhase(input), "legacy_submitted_completion");
  assert.equal(resolveInitialDraftStep(input), "documents");

  const uploadedItem = emptyChecklist[0]!;
  assert.equal(canUploadChecklistItem(uploadedItem, "SUBMITTED"), true);

  const existingItem = completeChecklist[0]!;
  assert.equal(canUploadChecklistItem(existingItem, "SUBMITTED"), false);
});

test("becomes read only when submitted checklist is complete", () => {
  const input = phaseInput("SUBMITTED", completeChecklist);
  assert.equal(hasRequiredDocumentsPresent(completeChecklist), true);
  assert.equal(resolveOrganizerScreenPhase(input), "read_only");
});

test("keeps under review read only even when checklist is incomplete", () => {
  const input = phaseInput("UNDER_REVIEW", emptyChecklist);
  assert.equal(resolveOrganizerScreenPhase(input), "read_only");
  assert.equal(canUploadChecklistItem(emptyChecklist[0]!, "UNDER_REVIEW"), false);
});

test("marks submitted and under review review statuses as read only helpers", () => {
  assert.equal(isReadOnlyReviewStatus("SUBMITTED"), true);
  assert.equal(isReadOnlyReviewStatus("UNDER_REVIEW"), true);
  assert.equal(toDocumentCardReviewStatus("CHANGES_REQUESTED"), "CHANGES_REQUESTED");
});

test("allows reupload only for rejected or reupload requested items in changes requested", () => {
  const rejectedItem: DocumentChecklistItem = {
    documentType: "IDENTITY_FRONT",
    required: true,
    latestDocumentId: "doc-1",
    latestStatus: "REJECTED",
    latestVersion: 1,
    satisfied: false,
  };

  assert.equal(canUploadChecklistItem(rejectedItem, "CHANGES_REQUESTED"), true);
  assert.equal(canUploadChecklistItem(rejectedItem, "SUBMITTED"), false);
});

test("resumes draft documents phase when review status is draft", () => {
  assert.equal(
    resolveOrganizerScreenPhase(phaseInput("DRAFT", emptyChecklist, "not_applied")),
    "draft_documents",
  );
});

test("enables pending settings navigation", () => {
  assert.equal(isPendingOrganizerApplicationNavigable("pending"), true);
  assert.equal(isPendingOrganizerApplicationNavigable("approved"), false);
});

test("keeps legacy pending applications read only when current application is missing", () => {
  assert.equal(
    resolveOrganizerScreenPhase({
      organizerStatus: "pending",
      reviewStatus: null,
      checklist: [],
    }),
    "read_only",
  );
});

test("allows only one active document upload at a time", () => {
  assert.equal(canStartDocumentUpload(null), true);
  assert.equal(canStartDocumentUpload("IDENTITY_FRONT"), false);
});

test("mock backend draft upload and submit flow stays local without cloudinary network", () => {
  resetOrganizerVerificationMockState();

  const draft = createMockOrganizerDraft({
    type: "INDIVIDUAL",
    reason: "Mock draft reason text",
  });

  assert.ok(draft.application);
  assert.equal(draft.application.reviewStatus, "DRAFT");
  assert.equal(draft.documentChecklist.length, 3);

  const intent = createMockUploadIntent({ documentType: "IDENTITY_FRONT" });
  assert.equal("folder" in intent, false);
  assert.equal(intent.fields.overwrite, "false");

  const finalized = finalizeMockUploadIntent(intent.intentId);
  assert.equal(finalized.document.status, "UPLOADED");

  finalizeMockUploadIntent(createMockUploadIntent({ documentType: "IDENTITY_BACK" }).intentId);
  finalizeMockUploadIntent(createMockUploadIntent({ documentType: "SELFIE" }).intentId);

  const current = getMockCurrentOrganizerApplication();
  assert.equal(isSubmitEligible(current.documentChecklist), true);

  const submitted = submitMockOrganizerApplication();
  assert.equal(submitted.application?.reviewStatus, "SUBMITTED");
});

test("individual wizard includes intro motivation identity docs and review", () => {
  const steps = getWizardSteps("INDIVIDUAL");
  assert.deepEqual(steps, [
    "intro",
    "motivation",
    "identity_front",
    "identity_back",
    "selfie",
    "review",
  ]);
});

test("business wizard includes tax registration and signature steps", () => {
  const steps = getWizardSteps("BUSINESS");
  assert.deepEqual(steps, [
    "intro",
    "motivation",
    "identity_front",
    "identity_back",
    "selfie",
    "tax_document",
    "business_registration",
    "authorized_signature",
    "review",
  ]);
});

test("required document helper returns individual and business lists", () => {
  assert.deepEqual(getRequiredDocumentTypes("INDIVIDUAL"), [
    "IDENTITY_FRONT",
    "IDENTITY_BACK",
    "SELFIE",
  ]);
  assert.deepEqual(getRequiredDocumentTypes("BUSINESS"), [
    "IDENTITY_FRONT",
    "IDENTITY_BACK",
    "SELFIE",
    "TAX_DOCUMENT",
    "BUSINESS_REGISTRATION",
    "AUTHORIZED_SIGNATORY",
  ]);
});

test("validateOrganizerMotivation enforces minimum length", () => {
  assert.match(validateOrganizerMotivation("short") ?? "", /10 karakter/);
  assert.equal(validateOrganizerMotivation("This is long enough"), null);
});

test("resolveInitialWizardStep resumes draft at first incomplete document", () => {
  const incompleteChecklist = buildChecklist(["UPLOADED", null, null]);
  assert.equal(
    resolveInitialWizardStep({
      screenPhase: "draft_documents",
      applicationType: "INDIVIDUAL",
      checklist: incompleteChecklist,
      reviewStatus: "DRAFT",
    }),
    "identity_back",
  );
});

test("resolveInitialWizardStep opens intro for new applications", () => {
  assert.equal(
    resolveInitialWizardStep({
      screenPhase: "draft_info",
      applicationType: "INDIVIDUAL",
      checklist: emptyChecklist,
      reviewStatus: null,
    }),
    "intro",
  );
});

test("document step completion blocks continue until uploaded", () => {
  const missing = emptyChecklist[0]!;
  assert.equal(canProceedFromDocumentStep(missing), false);
  assert.equal(canProceedFromDocumentStep(undefined), false);
  assert.equal(canProceedFromDocumentStep(completeChecklist[0]!), true);
});

test("checklist item completion uses single submit-ready rules", () => {
  const missing = emptyChecklist[0]!;
  assert.equal(isChecklistItemComplete(missing), false);
  assert.equal(isChecklistItemSubmitReady(missing), false);

  assert.equal(isChecklistItemComplete(buildChecklist(["UPLOADED", null, null])[0]!), true);
  assert.equal(isChecklistItemComplete(buildChecklist(["UNDER_REVIEW", null, null])[0]!), true);
  assert.equal(isChecklistItemComplete(buildChecklist(["APPROVED", null, null])[0]!), true);

  assert.equal(isChecklistItemComplete(buildChecklist(["REJECTED", null, null])[0]!), false);
  assert.equal(isChecklistItemComplete(buildChecklist(["REUPLOAD_REQUESTED", null, null])[0]!), false);

  assert.equal(isChecklistItemComplete(completeChecklist[0]!), true);
  assert.equal(isSubmitEligible(completeChecklist), true);
});

test("wizard submit enabled only for draft and changes requested when eligible", () => {
  assert.equal(isWizardSubmitEnabled(completeChecklist, "draft_documents"), true);
  assert.equal(isWizardSubmitEnabled(emptyChecklist, "draft_documents"), false);
  assert.equal(isWizardSubmitEnabled(completeChecklist, "read_only"), false);
});

test("changes requested allows upload only for rejected or reupload requested items", () => {
  const rejectedItem: DocumentChecklistItem = {
    documentType: "IDENTITY_FRONT",
    required: true,
    latestDocumentId: "doc-1",
    latestStatus: "REJECTED",
    latestVersion: 1,
    satisfied: false,
  };

  assert.equal(isChecklistItemComplete(rejectedItem), false);
  assert.equal(canUploadChecklistItem(rejectedItem, "CHANGES_REQUESTED"), true);
  assert.equal(canUploadChecklistItem(rejectedItem, "UNDER_REVIEW"), false);
});

test("legacy submitted completion resumes at first missing document step", () => {
  assert.equal(findFirstIncompleteDocumentStep(emptyChecklist, "INDIVIDUAL"), "identity_front");
});
