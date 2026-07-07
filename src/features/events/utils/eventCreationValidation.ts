import type {
  EventCreationDraft,
  EventCreationFieldErrors,
  EventCreationStep,
  EventCreationValidationContext,
} from "../types/eventCreation";
import { EVENT_CREATION_STEPS } from "../types/eventCreation";
import { resolveEventCreationExitDecision } from "./eventCreationNavigation";
import { isEventMinAgeAllowedForOrganizer } from "./viewerAge";
import { parseTokenPriceInput } from "./eventTicketPricing";
import {
  EVENT_TIMEZONE_INVALID_MESSAGE,
  normalizeIanaTimezone,
  resolveWallClockValidationError,
  wallClockFromDate,
  wallClockToUtc,
} from "./eventTimezone";

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 4000;
const VENUE_MIN = 2;
const VENUE_MAX = 160;
const DEFAULT_END_OFFSET_HOURS = 2;

/** PostgreSQL INT4 upper bound for Event.capacity */
export const MAX_EVENT_CAPACITY = 2_147_483_647;

export const EVENT_CAPACITY_OVER_LIMIT_MESSAGE = "Etkinlik kapasitesi desteklenen sınırı aşıyor.";

export type CapacityParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "invalid" | "over_limit" };

export function resolveCapacityInput(value: string): CapacityParseResult {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: "invalid" };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false, reason: "invalid" };
  }

  if (parsed > MAX_EVENT_CAPACITY) {
    return { ok: false, reason: "over_limit" };
  }

  return { ok: true, value: parsed };
}

export function parseCapacityInput(value: string): number | null {
  const result = resolveCapacityInput(value);
  return result.ok ? result.value : null;
}

export function resolveCapacityValidationError(value: string): string | null {
  const result = resolveCapacityInput(value);
  if (result.ok) {
    return null;
  }

  return result.reason === "over_limit"
    ? EVENT_CAPACITY_OVER_LIMIT_MESSAGE
    : "Geçerli bir kapasite gir (pozitif tam sayı).";
}

export function resolveEndDateAfterStartChange(startsAt: Date, currentEndsAt: Date, now = new Date()): Date {
  if (currentEndsAt > startsAt) {
    return currentEndsAt;
  }

  const nextEnd = new Date(startsAt);
  nextEnd.setHours(nextEnd.getHours() + DEFAULT_END_OFFSET_HOURS);

  if (nextEnd <= startsAt) {
    nextEnd.setMinutes(nextEnd.getMinutes() + 30);
  }

  if (nextEnd < now) {
    const fallback = new Date(startsAt);
    fallback.setHours(fallback.getHours() + DEFAULT_END_OFFSET_HOURS);
    return fallback;
  }

  return nextEnd;
}

function validateBasicsStep(draft: EventCreationDraft): EventCreationFieldErrors {
  const errors: EventCreationFieldErrors = {};
  const trimmedTitle = draft.title.trim();
  const trimmedDescription = draft.description.trim();

  if (trimmedTitle.length < TITLE_MIN) {
    errors.title = "Etkinlik adı en az 3 karakter olmalı.";
  } else if (trimmedTitle.length > TITLE_MAX) {
    errors.title = "Etkinlik adı en fazla 120 karakter olabilir.";
  }

  if (trimmedDescription.length < DESCRIPTION_MIN) {
    errors.description = "Açıklama en az 10 karakter olmalı.";
  } else if (trimmedDescription.length > DESCRIPTION_MAX) {
    errors.description = "Açıklama en fazla 4000 karakter olabilir.";
  }

  if (!draft.eventType) {
    errors.eventType = "Etkinlik türü seçmelisin.";
  }

  return errors;
}

function getValidationNow(context: EventCreationValidationContext): Date {
  return context.now ?? new Date();
}

function validateDateLocationStep(draft: EventCreationDraft, context: EventCreationValidationContext): EventCreationFieldErrors {
  const errors: EventCreationFieldErrors = {};
  const now = getValidationNow(context);
  const trimmedVenue = draft.venueName.trim();
  const trimmedCity = draft.city.trim();
  const trimmedCountryCode = draft.countryCode.trim().toUpperCase();
  const timezone = normalizeIanaTimezone(draft.timezone);

  if (!timezone) {
    errors.timezone = EVENT_TIMEZONE_INVALID_MESSAGE;
  }

  if (trimmedVenue.length < VENUE_MIN) {
    errors.venueName = "Mekan adı en az 2 karakter olmalı.";
  } else if (trimmedVenue.length > VENUE_MAX) {
    errors.venueName = "Mekan adı en fazla 160 karakter olabilir.";
  }

  if (!trimmedCity || trimmedCountryCode.length < 2) {
    errors.location = "Şehir ve ülke seçmelisin.";
  }

  if (!timezone) {
    return errors;
  }

  const startWall = wallClockFromDate(draft.startsAt);
  const endWall = wallClockFromDate(draft.endsAt);

  const startWallError = resolveWallClockValidationError(startWall, timezone);
  if (startWallError) {
    errors.startsAt = startWallError;
  }

  const endWallError = resolveWallClockValidationError(endWall, timezone);
  if (endWallError) {
    errors.endsAt = endWallError;
  }

  const startUtc = wallClockToUtc(startWall, timezone);
  const endUtc = wallClockToUtc(endWall, timezone);

  if (startUtc.ok && startUtc.utcMillis < now.getTime()) {
    errors.startsAt = "Başlangıç zamanı geçmişte olamaz.";
  }

  if (startUtc.ok && endUtc.ok && endUtc.utcMillis <= startUtc.utcMillis) {
    errors.endsAt = "Bitiş zamanı başlangıçtan sonra olmalı.";
  }

  return errors;
}

function validateParticipationStep(
  draft: EventCreationDraft,
  context: EventCreationValidationContext,
): EventCreationFieldErrors {
  const errors: EventCreationFieldErrors = {};

  const capacityError = resolveCapacityValidationError(draft.capacityInput);
  if (capacityError) {
    errors.capacity = capacityError;
  }

  if (draft.hasAlcohol && draft.minAge == null) {
    errors.hasAlcohol = "Alkollü etkinlik için yaş sınırı (18+/21+) seçmelisin.";
  }

  if (draft.minAge != null && !isEventMinAgeAllowedForOrganizer(context.organizerAge, draft.minAge)) {
    errors.minAge = "Kendi yaşından büyük yaş sınırı koyamazsın.";
  }

  return errors;
}

function validateTicketsStep(draft: EventCreationDraft): EventCreationFieldErrors {
  const errors: EventCreationFieldErrors = {};

  if (draft.ticketMode === "token" && parseTokenPriceInput(draft.tokenPriceInput) == null) {
    errors.tokenPrice = "Geçerli bir token fiyatı gir (pozitif tam sayı).";
  }

  return errors;
}

export function validateEventCreationStep(
  step: EventCreationStep,
  draft: EventCreationDraft,
  context: EventCreationValidationContext,
): EventCreationFieldErrors {
  switch (step) {
    case 1:
      return validateBasicsStep(draft);
    case 2:
      return validateDateLocationStep(draft, context);
    case 3:
      return validateParticipationStep(draft, context);
    case 4:
      return validateTicketsStep(draft);
    case 5:
      return validateCompleteEventDraft(draft, context);
  }
}

export function validateCompleteEventDraft(
  draft: EventCreationDraft,
  context: EventCreationValidationContext,
): EventCreationFieldErrors {
  return {
    ...validateBasicsStep(draft),
    ...validateDateLocationStep(draft, context),
    ...validateParticipationStep(draft, context),
    ...validateTicketsStep(draft),
  };
}

export function resolveFirstInvalidStep(
  draft: EventCreationDraft,
  context: EventCreationValidationContext,
): EventCreationStep | null {
  for (const step of EVENT_CREATION_STEPS) {
    if (step === 5) {
      continue;
    }

    const errors = validateEventCreationStep(step, draft, context);
    if (Object.keys(errors).length > 0) {
      return step;
    }
  }

  const completeErrors = validateCompleteEventDraft(draft, context);
  if (Object.keys(completeErrors).length > 0) {
    return resolveFirstInvalidStepFromErrors(completeErrors);
  }

  return null;
}

function resolveFirstInvalidStepFromErrors(errors: EventCreationFieldErrors): EventCreationStep {
  const step1Keys = ["title", "description", "eventType"] as const;
  const step2Keys = ["startsAt", "endsAt", "venueName", "location", "timezone"] as const;
  const step3Keys = ["capacity", "minAge", "hasAlcohol"] as const;
  const step4Keys = ["tokenPrice"] as const;

  if (step1Keys.some((key) => errors[key])) {
    return 1;
  }
  if (step2Keys.some((key) => errors[key])) {
    return 2;
  }
  if (step3Keys.some((key) => errors[key])) {
    return 3;
  }
  if (step4Keys.some((key) => errors[key])) {
    return 4;
  }

  return 1;
}

export function resolveEventCreationStepState(
  draft: EventCreationDraft,
  context: EventCreationValidationContext,
  currentStep: EventCreationStep,
): { completedSteps: EventCreationStep[]; canProceed: boolean } {
  const completedSteps = EVENT_CREATION_STEPS.filter((step) => {
    if (step >= currentStep || step >= 5) {
      return false;
    }
    return Object.keys(validateEventCreationStep(step, draft, context)).length === 0;
  });

  const currentErrors = currentStep < 5 ? validateEventCreationStep(currentStep, draft, context) : {};
  return {
    completedSteps,
    canProceed: Object.keys(currentErrors).length === 0,
  };
}

export function hasUnsavedDraftChanges(initial: EventCreationDraft, current: EventCreationDraft): boolean {
  return (
    initial.title !== current.title ||
    initial.description !== current.description ||
    initial.eventType !== current.eventType ||
    initial.coverUri !== current.coverUri ||
    initial.startsAt.getTime() !== current.startsAt.getTime() ||
    initial.endsAt.getTime() !== current.endsAt.getTime() ||
    initial.venueName !== current.venueName ||
    initial.city !== current.city ||
    initial.countryCode !== current.countryCode ||
    initial.timezone !== current.timezone ||
    initial.capacityInput !== current.capacityInput ||
    initial.visibility !== current.visibility ||
    initial.minAge !== current.minAge ||
    initial.hasAlcohol !== current.hasAlcohol ||
    initial.smokingAllowed !== current.smokingAllowed ||
    initial.ticketMode !== current.ticketMode ||
    initial.tokenPriceInput !== current.tokenPriceInput
  );
}

export function shouldBlockExitForUnsavedChanges(input: {
  isDirty: boolean;
  isSubmitting: boolean;
  allowNavigationAfterSuccess?: boolean;
}): boolean {
  return (
    resolveEventCreationExitDecision({
      isDirty: input.isDirty,
      isSubmitting: input.isSubmitting,
      allowNavigationAfterSuccess: input.allowNavigationAfterSuccess ?? false,
    }) === "confirm"
  );
}

export function resolveActiveEventCheckFailureMessage(): string {
  return "Aktif etkinlik limiti kontrol edilemedi. Lütfen tekrar dene.";
}

export function shouldAllowCreateAfterActiveEventCheck(state: { status: string; hasActiveEvent?: boolean }): boolean {
  if (state.status !== "ready") {
    return false;
  }
  return !state.hasActiveEvent;
}
