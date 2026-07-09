import type {
  DocumentChecklistItem,
  OrganizerApplicationType,
  OrganizerReviewStatus,
  VerificationDocumentType,
} from "../types/organizer";
import {
  DOCUMENT_TYPE_LABELS,
  isChecklistItemComplete,
  isSubmitEligible,
  type OrganizerScreenPhase,
} from "./organizer-verification";

export const ORGANIZER_MOTIVATION_MIN_LENGTH = 10;
export const ORGANIZER_MOTIVATION_MAX_LENGTH = 2000;

export type OrganizerWizardStepId =
  | "intro"
  | "motivation"
  | "identity_front"
  | "identity_back"
  | "selfie"
  | "tax_document"
  | "business_registration"
  | "authorized_signature"
  | "review";

const INDIVIDUAL_WIZARD_STEPS: OrganizerWizardStepId[] = [
  "intro",
  "motivation",
  "identity_front",
  "identity_back",
  "selfie",
  "review",
];

const BUSINESS_WIZARD_STEPS: OrganizerWizardStepId[] = [
  "intro",
  "motivation",
  "identity_front",
  "identity_back",
  "selfie",
  "tax_document",
  "business_registration",
  "authorized_signature",
  "review",
];

const WIZARD_STEP_TO_DOCUMENT_TYPE: Partial<Record<OrganizerWizardStepId, VerificationDocumentType>> = {
  identity_front: "IDENTITY_FRONT",
  identity_back: "IDENTITY_BACK",
  selfie: "SELFIE",
  tax_document: "TAX_DOCUMENT",
  business_registration: "BUSINESS_REGISTRATION",
  authorized_signature: "AUTHORIZED_SIGNATORY",
};

const DOCUMENT_TYPE_TO_WIZARD_STEP: Record<VerificationDocumentType, OrganizerWizardStepId> = {
  IDENTITY_FRONT: "identity_front",
  IDENTITY_BACK: "identity_back",
  SELFIE: "selfie",
  TAX_DOCUMENT: "tax_document",
  BUSINESS_REGISTRATION: "business_registration",
  AUTHORIZED_SIGNATORY: "authorized_signature",
};

const INDIVIDUAL_REQUIRED_DOCUMENTS: VerificationDocumentType[] = [
  "IDENTITY_FRONT",
  "IDENTITY_BACK",
  "SELFIE",
];

const BUSINESS_REQUIRED_DOCUMENTS: VerificationDocumentType[] = [
  ...INDIVIDUAL_REQUIRED_DOCUMENTS,
  "TAX_DOCUMENT",
  "BUSINESS_REGISTRATION",
  "AUTHORIZED_SIGNATORY",
];

export function getWizardSteps(applicationType: OrganizerApplicationType): OrganizerWizardStepId[] {
  return applicationType === "BUSINESS" ? BUSINESS_WIZARD_STEPS : INDIVIDUAL_WIZARD_STEPS;
}

export function getRequiredDocumentTypes(
  applicationType: OrganizerApplicationType,
): VerificationDocumentType[] {
  return applicationType === "BUSINESS" ? BUSINESS_REQUIRED_DOCUMENTS : INDIVIDUAL_REQUIRED_DOCUMENTS;
}

export function isDocumentWizardStep(stepId: OrganizerWizardStepId): boolean {
  return stepId in WIZARD_STEP_TO_DOCUMENT_TYPE;
}

export function resolveWizardDocumentType(stepId: OrganizerWizardStepId): VerificationDocumentType | null {
  return WIZARD_STEP_TO_DOCUMENT_TYPE[stepId] ?? null;
}

export function resolveWizardStepForDocumentType(
  documentType: VerificationDocumentType,
): OrganizerWizardStepId {
  return DOCUMENT_TYPE_TO_WIZARD_STEP[documentType];
}

export function resolveWizardStepIndex(
  steps: OrganizerWizardStepId[],
  stepId: OrganizerWizardStepId,
): number {
  const index = steps.indexOf(stepId);
  return index >= 0 ? index : 0;
}

export function getWizardProgress(steps: OrganizerWizardStepId[], currentStepId: OrganizerWizardStepId) {
  const current = resolveWizardStepIndex(steps, currentStepId) + 1;
  const total = steps.length;
  return {
    current,
    total,
    progress: total > 0 ? current / total : 0,
  };
}

export function getNextWizardStep(
  steps: OrganizerWizardStepId[],
  currentStepId: OrganizerWizardStepId,
): OrganizerWizardStepId | null {
  const index = resolveWizardStepIndex(steps, currentStepId);
  return steps[index + 1] ?? null;
}

export function getPreviousWizardStep(
  steps: OrganizerWizardStepId[],
  currentStepId: OrganizerWizardStepId,
): OrganizerWizardStepId | null {
  const index = resolveWizardStepIndex(steps, currentStepId);
  return index > 0 ? steps[index - 1] ?? null : null;
}

export function validateOrganizerMotivation(motivation: string): string | null {
  const reason = motivation.trim();

  if (reason.length < ORGANIZER_MOTIVATION_MIN_LENGTH) {
    return "Lütfen en az 10 karakterlik bir motivasyon yaz.";
  }

  if (reason.length > ORGANIZER_MOTIVATION_MAX_LENGTH) {
    return "Motivasyon en fazla 2000 karakter olabilir.";
  }

  return null;
}

export function findFirstIncompleteDocumentStep(
  checklist: DocumentChecklistItem[],
  applicationType: OrganizerApplicationType,
): OrganizerWizardStepId | null {
  for (const documentType of getRequiredDocumentTypes(applicationType)) {
    const item = checklist.find((entry) => entry.documentType === documentType);
    if (!item || !isChecklistItemComplete(item)) {
      return resolveWizardStepForDocumentType(documentType);
    }
  }

  return null;
}

export function resolveInitialWizardStep(input: {
  screenPhase: OrganizerScreenPhase;
  applicationType: OrganizerApplicationType;
  checklist: DocumentChecklistItem[];
  reviewStatus: OrganizerReviewStatus | null;
}): OrganizerWizardStepId {
  if (input.screenPhase === "draft_info") {
    return "intro";
  }

  const incompleteStep = findFirstIncompleteDocumentStep(input.checklist, input.applicationType);

  if (incompleteStep) {
    return incompleteStep;
  }

  return "review";
}

export function canProceedFromDocumentStep(item: DocumentChecklistItem | undefined): boolean {
  if (!item) {
    return false;
  }

  return isChecklistItemComplete(item);
}

export function isWizardSubmitEnabled(
  checklist: DocumentChecklistItem[],
  screenPhase: OrganizerScreenPhase,
): boolean {
  if (screenPhase !== "draft_documents" && screenPhase !== "changes_requested") {
    return false;
  }

  return isSubmitEligible(checklist);
}

export function getDocumentStepGuidance(documentType: VerificationDocumentType): {
  title: string;
  why: string;
  formats: string;
  maxSize: string;
} {
  const title = DOCUMENT_TYPE_LABELS[documentType];

  if (documentType === "SELFIE") {
    return {
      title,
      why: "Kimlik belgenle eşleştiğini doğrulamak için canlı bir selfie istiyoruz.",
      formats: "JPEG veya PNG",
      maxSize: "En fazla 10 MB",
    };
  }

  if (documentType === "TAX_DOCUMENT") {
    return {
      title,
      why: "İşletmenin vergi mükellefiyetini doğrulamak için vergi levhası veya eşdeğer belge gerekir.",
      formats: "JPEG, PNG veya PDF",
      maxSize: "En fazla 10 MB",
    };
  }

  if (documentType === "BUSINESS_REGISTRATION") {
    return {
      title,
      why: "İşletmenin resmi tescil kaydını doğrulamak için tescil belgesi gerekir.",
      formats: "JPEG, PNG veya PDF",
      maxSize: "En fazla 10 MB",
    };
  }

  if (documentType === "AUTHORIZED_SIGNATORY") {
    return {
      title,
      why: "Başvuruyu yapan kişinin işletme adına yetkili olduğunu doğrulamak için imza sirküleri veya yetki belgesi gerekir.",
      formats: "JPEG, PNG veya PDF",
      maxSize: "En fazla 10 MB",
    };
  }

  if (documentType === "IDENTITY_FRONT") {
    return {
      title,
      why: "Kimliğinin ön yüzünü net şekilde görebilmemiz gerekiyor.",
      formats: "JPEG, PNG veya PDF",
      maxSize: "En fazla 10 MB",
    };
  }

  return {
    title,
    why: "Kimliğinin arka yüzünü net şekilde görebilmemiz gerekiyor.",
    formats: "JPEG, PNG veya PDF",
    maxSize: "En fazla 10 MB",
  };
}

export function getIntroContent(applicationType: OrganizerApplicationType): {
  headline: string;
  bullets: string[];
} {
  if (applicationType === "BUSINESS") {
    return {
      headline: "İşletme hesabınla organizatör ol",
      bullets: [
        "İşletme adına güvenli etkinlikler düzenle",
        "Topluluk güveni için belge doğrulaması gerekir",
        "Vergi, tescil ve yetki belgeleri istenir",
      ],
    };
  }

  return {
    headline: "Organizatör ol, topluluğa etkinlik düzenle",
    bullets: [
      "Topluluk etkinlikleri düzenle",
      "Güven ve şeffaflık için kimlik doğrulaması gerekir",
      "Kimlik ön/arka yüz ve selfie ile başvurunu tamamla",
    ],
  };
}
