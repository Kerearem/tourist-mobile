import type {
  CurrentOrganizerApplicationResponse,
  DocumentChecklistItem,
  FinalizeVerificationUploadResponse,
  OrganizerApplicationType,
  OrganizerDraftResponse,
  UploadIntentResponse,
  VerificationDocumentMetadata,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from "../types/organizer";

type MockDocumentRecord = VerificationDocumentMetadata;

type MockState = {
  application: CurrentOrganizerApplicationResponse["application"];
  documents: MockDocumentRecord[];
  intents: Map<string, { documentType: VerificationDocumentType; expiresAt: string; consumed: boolean }>;
};

const INDIVIDUAL_TYPES: VerificationDocumentType[] = [
  "IDENTITY_FRONT",
  "IDENTITY_BACK",
  "SELFIE",
];

const BUSINESS_TYPES: VerificationDocumentType[] = [
  ...INDIVIDUAL_TYPES,
  "TAX_DOCUMENT",
  "BUSINESS_REGISTRATION",
  "AUTHORIZED_SIGNATORY",
];

let mockState: MockState = {
  application: null,
  documents: [],
  intents: new Map(),
};

const requiredTypesFor = (type: OrganizerApplicationType) =>
  type === "BUSINESS" ? BUSINESS_TYPES : INDIVIDUAL_TYPES;

const buildChecklist = (applicationType: OrganizerApplicationType, documents: MockDocumentRecord[]): DocumentChecklistItem[] => {
  const latestByType = new Map<VerificationDocumentType, MockDocumentRecord>();

  for (const document of documents) {
    const current = latestByType.get(document.documentType);
    if (!current || document.version > current.version) {
      latestByType.set(document.documentType, document);
    }
  }

  return requiredTypesFor(applicationType).map((documentType) => {
    const latest = latestByType.get(documentType) ?? null;
    return {
      documentType,
      required: true,
      latestDocumentId: latest?.id ?? null,
      latestStatus: latest?.status ?? null,
      latestVersion: latest?.version ?? null,
      satisfied: latest?.status === "APPROVED",
    };
  });
};

export function resetOrganizerVerificationMockState() {
  mockState = {
    application: null,
    documents: [],
    intents: new Map(),
  };
}

export function getMockCurrentOrganizerApplication(): CurrentOrganizerApplicationResponse {
  if (!mockState.application) {
    return { application: null, documentChecklist: [] };
  }

  return {
    application: mockState.application,
    documentChecklist: buildChecklist(mockState.application.type, mockState.documents),
  };
}

export function createMockOrganizerDraft(input: {
  type: OrganizerApplicationType;
  reason: string;
}): OrganizerDraftResponse {
  const now = new Date().toISOString();
  const applicationId = mockState.application?.id ?? `mock_app_${Date.now()}`;

  mockState.application = {
    id: applicationId,
    type: input.type,
    reviewStatus: "DRAFT",
    status: "NOT_APPLIED",
    reason: input.reason,
    changeRequestReason: null,
    createdAt: mockState.application?.createdAt ?? now,
    updatedAt: now,
  };

  const application = mockState.application;

  return {
    application: {
      id: application.id,
      type: application.type,
      reviewStatus: application.reviewStatus,
      reason: application.reason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    },
    documentChecklist: buildChecklist(application.type, mockState.documents),
  };
}

export function createMockUploadIntent(input: {
  documentType: VerificationDocumentType;
}): UploadIntentResponse {
  const intentId = `mock_intent_${mockState.intents.size + 1}`;
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

  mockState.intents.set(intentId, {
    documentType: input.documentType,
    expiresAt,
    consumed: false,
  });

  return {
    intentId,
    uploadUrl: "https://mock.cloudinary.local/image/upload",
    expiresAt,
    resourceType: "image",
    fields: {
      api_key: "mock_api_key",
      timestamp: String(Math.floor(Date.now() / 1000)),
      signature: "mock_signature",
      public_id: `tourist/verification/mock/${input.documentType.toLowerCase()}/doc_mock`,
      type: "authenticated",
      overwrite: "false",
    },
  };
}

export function finalizeMockUploadIntent(intentId: string): FinalizeVerificationUploadResponse {
  if (!mockState.application) {
    throw new Error("Mock başvuru bulunamadı.");
  }

  const intent = mockState.intents.get(intentId);
  if (!intent) {
    throw new Error("Upload intent not found");
  }

  const existing = mockState.documents
    .filter((document) => document.documentType === intent.documentType)
    .sort((a, b) => b.version - a.version)[0];

  const version = (existing?.version ?? 0) + 1;
  const now = new Date().toISOString();
  const document: VerificationDocumentMetadata = {
    id: `mock_doc_${mockState.documents.length + 1}`,
    documentType: intent.documentType,
    originalFileName: "mock-upload.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    status: "UPLOADED" satisfies VerificationDocumentStatus,
    version,
    replacesDocumentId: existing?.id ?? null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockState.documents.push(document);
  intent.consumed = true;

  return {
    document,
    documentChecklist: buildChecklist(mockState.application.type, mockState.documents),
  };
}

export function submitMockOrganizerApplication(): CurrentOrganizerApplicationResponse {
  if (!mockState.application) {
    throw new Error("Mock başvuru bulunamadı.");
  }

  mockState.application = {
    ...mockState.application,
    reviewStatus: "SUBMITTED",
    status: "PENDING",
    updatedAt: new Date().toISOString(),
  };

  return getMockCurrentOrganizerApplication();
}

export function setMockOrganizerReviewStatus(reviewStatus: CurrentOrganizerApplicationResponse["application"] extends infer T
  ? T extends { reviewStatus: infer R }
    ? R
    : never
  : never) {
  if (!mockState.application) {
    return;
  }

  mockState.application = {
    ...mockState.application,
    reviewStatus,
    updatedAt: new Date().toISOString(),
  };
}
