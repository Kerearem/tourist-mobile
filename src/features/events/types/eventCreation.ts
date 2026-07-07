import type { EventType } from "../constants/eventTypes";

export type EventCreationStep = 1 | 2 | 3 | 4 | 5;

export const EVENT_CREATION_STEPS: EventCreationStep[] = [1, 2, 3, 4, 5];

export const EVENT_CREATION_STEP_TITLES: Record<EventCreationStep, string> = {
  1: "Temel Bilgiler",
  2: "Tarih ve Konum",
  3: "Katılım",
  4: "Biletler",
  5: "Önizleme",
};

export type EventCreationTicketMode = "free" | "token";

export type EventCreationVisibility = "city" | "country";

export type EventMinAgeOption = null | 18 | 21;

export type EventCreationDraft = {
  title: string;
  description: string;
  eventType: EventType | null;
  coverUri: string | null;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  city: string;
  countryCode: string;
  timezone?: string;
  capacityInput: string;
  visibility: EventCreationVisibility;
  minAge: EventMinAgeOption;
  hasAlcohol: boolean;
  smokingAllowed: boolean;
  ticketMode: EventCreationTicketMode;
  tokenPriceInput: string;
};

export type EventCreationCapabilities = {
  maxConcurrentActiveEvents: number;
  maxTicketOptionsPerEvent: number;
  canUseMultipleTicketOptions: boolean;
  canUsePackageInclusions: boolean;
};

export type EventCreationFieldKey =
  | "title"
  | "description"
  | "eventType"
  | "startsAt"
  | "endsAt"
  | "venueName"
  | "location"
  | "capacity"
  | "minAge"
  | "hasAlcohol"
  | "tokenPrice";

export type EventCreationFieldErrors = Partial<Record<EventCreationFieldKey, string>>;

export type EventCreationValidationContext = {
  now?: Date;
  organizerAge: number | null;
};

export type EventCreationStepState = {
  currentStep: EventCreationStep;
  completedSteps: EventCreationStep[];
};

export type ActiveEventCheckState =
  | { status: "loading" }
  | { status: "ready"; hasActiveEvent: boolean; activeEventTitle: string | null }
  | { status: "error"; message: string };
