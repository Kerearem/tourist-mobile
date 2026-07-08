export type EventCreationExitDecision = "allow" | "block" | "confirm";

export const EVENT_CREATION_EXIT_ALERT = {
  title: "Etkinlik taslağından çıkmak istiyor musun?",
  message: "Kaydedilmemiş değişiklikler kaybolacak.",
  stayLabel: "Devam Et",
  leaveLabel: "Çık",
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
