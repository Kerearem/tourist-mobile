import type { VerificationDocumentType } from "../types/organizer";

export type GuidedCaptureMode = "identity" | "selfie";

export type DocumentCaptureActionKind = "guided_camera" | "gallery" | "file_picker";

export type DocumentCaptureAction = {
  kind: DocumentCaptureActionKind;
  label: string;
  primary: boolean;
};

export type GuidedCaptureCopy = {
  title: string;
  primaryInstruction: string;
  secondaryInstruction: string;
  previewTitle: string;
  retakeLabel: string;
  confirmLabel: string;
};

export const CANONICAL_ORGANIZER_INDIVIDUAL_DOCUMENT_TYPES = [
  "IDENTITY_FRONT",
  "IDENTITY_BACK",
  "SELFIE",
] as const;

export const CANONICAL_ORGANIZER_BUSINESS_DOCUMENT_TYPES = [
  ...CANONICAL_ORGANIZER_INDIVIDUAL_DOCUMENT_TYPES,
  "TAX_DOCUMENT",
  "BUSINESS_REGISTRATION",
  "AUTHORIZED_SIGNATORY",
] as const;

const IDENTITY_DOCUMENT_TYPES: VerificationDocumentType[] = ["IDENTITY_FRONT", "IDENTITY_BACK"];
const BUSINESS_FILE_PICKER_TYPES: VerificationDocumentType[] = [
  "TAX_DOCUMENT",
  "BUSINESS_REGISTRATION",
  "AUTHORIZED_SIGNATORY",
];

export function isGuidedCameraDocumentType(documentType: VerificationDocumentType): boolean {
  return (
    documentType === "IDENTITY_FRONT" ||
    documentType === "IDENTITY_BACK" ||
    documentType === "SELFIE"
  );
}

export function isBusinessFilePickerDocumentType(documentType: VerificationDocumentType): boolean {
  return BUSINESS_FILE_PICKER_TYPES.includes(documentType);
}

export function resolveGuidedCaptureMode(
  documentType: VerificationDocumentType,
): GuidedCaptureMode | null {
  if (documentType === "SELFIE") {
    return "selfie";
  }

  if (IDENTITY_DOCUMENT_TYPES.includes(documentType)) {
    return "identity";
  }

  return null;
}

export function getGuidedCaptureCopy(mode: GuidedCaptureMode): GuidedCaptureCopy {
  if (mode === "selfie") {
    return {
      title: "Canlılık/selfie",
      primaryInstruction: "Yüzünü çerçevenin içine al",
      secondaryInstruction: "Işık yeterli olsun, yüzün net görünsün",
      previewTitle: "Selfie önizleme",
      retakeLabel: "Tekrar Çek",
      confirmLabel: "Bu Fotoğrafı Kullan",
    };
  }

  return {
    title: "Kimlik fotoğrafı",
    primaryInstruction: "Kimliğini çerçevenin içine hizala",
    secondaryInstruction: "Tüm köşeler görünsün, parlama olmasın",
    previewTitle: "Kimlik önizleme",
    retakeLabel: "Tekrar Çek",
    confirmLabel: "Bu Fotoğrafı Kullan",
  };
}

export function getDocumentCaptureActions(
  documentType: VerificationDocumentType,
  options?: { isRealDevice?: boolean },
): DocumentCaptureAction[] {
  // Default to real-device behavior: photo-based KYC types are camera-only.
  const isRealDevice = options?.isRealDevice ?? true;

  if (isGuidedCameraDocumentType(documentType)) {
    const actions: DocumentCaptureAction[] = [
      { kind: "guided_camera", label: "Kamera ile Çek", primary: true },
    ];

    // SIMULATOR-ONLY fallback: simulators/emulators have no camera hardware,
    // so gallery selection is the only way to test the flow in development.
    // Real devices never see this option for identity/selfie documents.
    if (!isRealDevice) {
      actions.push({ kind: "gallery", label: "Galeriden Seç", primary: false });
    }

    return actions;
  }

  if (isBusinessFilePickerDocumentType(documentType)) {
    return [{ kind: "file_picker", label: "Dosyadan Seç", primary: true }];
  }

  return [{ kind: "file_picker", label: "Yükle", primary: true }];
}
