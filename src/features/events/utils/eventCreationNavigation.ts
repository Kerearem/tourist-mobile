export type EventCreationExitDecision = "allow" | "block" | "confirm";

export const EVENT_CREATION_EXIT_ALERT = {
  title: "Kaydedilmemiş değişiklikler var",
  message: "Çıkarsan taslağın bu oturum boyunca saklanır ve daha sonra devam edebilirsin.",
  stayLabel: "Düzenlemeye devam",
  leaveLabel: "Çık ve sakla",
} as const;

export const EVENT_CREATION_RESUME_ALERT = {
  title: "Etkinlik taslağına devam et?",
  message: "Kaydedilmemiş bir etkinlik taslağın var.",
  continueLabel: "Devam et",
  discardLabel: "Sil ve yeni başla",
} as const;

export const EVENT_CREATION_SUBMITTING_ALERT = {
  title: "Gönderiliyor",
  message: "Etkinlik gönderilirken ekrandan çıkamazsın.",
  dismissLabel: "Tamam",
} as const;

export function resolveEventCreationExitDecision(input: {
  isDirty: boolean;
  isSubmitting: boolean;
  allowNavigationAfterSuccess: boolean;
}): EventCreationExitDecision {
  if (input.allowNavigationAfterSuccess) {
    return "allow";
  }

  if (input.isSubmitting) {
    return "block";
  }

  if (input.isDirty) {
    return "confirm";
  }

  return "allow";
}

export function resolveProtectedEventCreationExitDecision(input: {
  hasEnteredWizard: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  allowNavigationAfterSuccess: boolean;
}): EventCreationExitDecision {
  if (!input.hasEnteredWizard) {
    return "allow";
  }

  return resolveEventCreationExitDecision({
    isDirty: input.isDirty,
    isSubmitting: input.isSubmitting,
    allowNavigationAfterSuccess: input.allowNavigationAfterSuccess,
  });
}

export function shouldPreventNavigationRemoval(decision: EventCreationExitDecision): boolean {
  return decision === "block" || decision === "confirm";
}
