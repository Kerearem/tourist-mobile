import type {
  CapabilityLevel,
  OrganizerCapabilities,
  OrganizerCapabilityUsage,
  OrganizerStatusResponse,
} from "../types/organizer";
import type { OrganizerStatus } from "../../../models/user";
import { ApiRequestError } from "../../../services/api/apiRequestError";

export const LEGACY_LEVEL_1_CAPABILITIES: OrganizerCapabilities = {
  maxConcurrentActiveEvents: 1,
  maxTicketOptionsPerEvent: 1,
  canUseMultipleTicketOptions: false,
  canUsePackageInclusions: false,
  maxCoHostsPerEvent: 0,
  canUseAdvancedAnalytics: false,
};

const CAPABILITY_MATRIX: Record<CapabilityLevel, OrganizerCapabilities> = {
  LEVEL_1: LEGACY_LEVEL_1_CAPABILITIES,
  LEVEL_2: {
    maxConcurrentActiveEvents: 3,
    maxTicketOptionsPerEvent: 3,
    canUseMultipleTicketOptions: true,
    canUsePackageInclusions: true,
    maxCoHostsPerEvent: 2,
    canUseAdvancedAnalytics: true,
  },
  LEVEL_3: {
    maxConcurrentActiveEvents: 10,
    maxTicketOptionsPerEvent: 10,
    canUseMultipleTicketOptions: true,
    canUsePackageInclusions: true,
    maxCoHostsPerEvent: 10,
    canUseAdvancedAnalytics: true,
  },
};

export type NormalizedOrganizerCapabilityStatus = {
  organizerStatus: OrganizerStatus;
  capabilityLevel: CapabilityLevel;
  capabilities: OrganizerCapabilities;
  usage: OrganizerCapabilityUsage;
  hasActiveEvent: boolean;
  activeEventTitle: string | null;
  application?: OrganizerStatusResponse["application"];
};

export type ActiveEventCheckState =
  | { status: "loading" }
  | {
      status: "ready";
      capabilityLevel: CapabilityLevel;
      capabilities: OrganizerCapabilities;
      usage: OrganizerCapabilityUsage;
      hasActiveEvent: boolean;
      activeEventTitle: string | null;
    }
  | { status: "error"; message: string };

function clampNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function isStrictPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isStrictNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCompleteCapabilitiesSnapshot(
  raw: Partial<OrganizerCapabilities> | null | undefined,
): raw is OrganizerCapabilities {
  if (!raw) {
    return false;
  }

  return (
    isStrictPositiveInteger(raw.maxConcurrentActiveEvents) &&
    isStrictPositiveInteger(raw.maxTicketOptionsPerEvent) &&
    typeof raw.canUseMultipleTicketOptions === "boolean" &&
    typeof raw.canUsePackageInclusions === "boolean" &&
    isStrictNonNegativeInteger(raw.maxCoHostsPerEvent) &&
    typeof raw.canUseAdvancedAnalytics === "boolean"
  );
}

function sanitizeCapabilitiesSnapshot(raw: OrganizerCapabilities): OrganizerCapabilities | null {
  if (
    !isStrictPositiveInteger(raw.maxConcurrentActiveEvents) ||
    !isStrictPositiveInteger(raw.maxTicketOptionsPerEvent) ||
    !isStrictNonNegativeInteger(raw.maxCoHostsPerEvent) ||
    typeof raw.canUseMultipleTicketOptions !== "boolean" ||
    typeof raw.canUsePackageInclusions !== "boolean" ||
    typeof raw.canUseAdvancedAnalytics !== "boolean"
  ) {
    return null;
  }

  return {
    maxConcurrentActiveEvents: raw.maxConcurrentActiveEvents,
    maxTicketOptionsPerEvent: raw.maxTicketOptionsPerEvent,
    canUseMultipleTicketOptions: raw.canUseMultipleTicketOptions,
    canUsePackageInclusions: raw.canUsePackageInclusions,
    maxCoHostsPerEvent: raw.maxCoHostsPerEvent,
    canUseAdvancedAnalytics: raw.canUseAdvancedAnalytics,
  };
}

function normalizeCapabilities(
  _level: CapabilityLevel,
  raw?: Partial<OrganizerCapabilities> | null,
): OrganizerCapabilities {
  if (!isCompleteCapabilitiesSnapshot(raw)) {
    return { ...LEGACY_LEVEL_1_CAPABILITIES };
  }

  const sanitized = sanitizeCapabilitiesSnapshot(raw);
  if (!sanitized) {
    return { ...LEGACY_LEVEL_1_CAPABILITIES };
  }

  return sanitized;
}

export function normalizeCapabilityUsage(
  capabilities: OrganizerCapabilities,
  rawUsage: Partial<OrganizerCapabilityUsage> | undefined,
  legacyHasActiveEvent: boolean | undefined,
): OrganizerCapabilityUsage {
  const maxConcurrent = capabilities.maxConcurrentActiveEvents;

  if (
    rawUsage &&
    typeof rawUsage.activeEventCount === "number" &&
    typeof rawUsage.remainingActiveEventSlots === "number"
  ) {
    const activeEventCount = clampNonNegativeInteger(rawUsage.activeEventCount, 0);
    const backendRemaining = clampNonNegativeInteger(rawUsage.remainingActiveEventSlots, 0);
    const derivedRemaining = Math.max(0, maxConcurrent - activeEventCount);
    const remainingActiveEventSlots = Math.min(backendRemaining, derivedRemaining);

    return { activeEventCount, remainingActiveEventSlots };
  }

  if (legacyHasActiveEvent === true) {
    return {
      activeEventCount: 1,
      remainingActiveEventSlots: 0,
    };
  }

  return {
    activeEventCount: 0,
    remainingActiveEventSlots: maxConcurrent,
  };
}

export function normalizeCapabilityLevel(value: unknown): CapabilityLevel {
  if (value === "LEVEL_1" || value === "LEVEL_2" || value === "LEVEL_3") {
    return value;
  }

  return "LEVEL_1";
}

export function normalizeOrganizerCapabilityStatus(
  raw: OrganizerStatusResponse,
): NormalizedOrganizerCapabilityStatus {
  const capabilityLevel = normalizeCapabilityLevel(raw.capabilityLevel);
  const capabilities = normalizeCapabilities(capabilityLevel, raw.capabilities);
  const usage = normalizeCapabilityUsage(capabilities, raw.usage, raw.hasActiveEvent);

  return {
    organizerStatus: raw.organizerStatus,
    capabilityLevel,
    capabilities,
    usage,
    hasActiveEvent: usage.activeEventCount > 0,
    activeEventTitle: raw.activeEventTitle ?? null,
    ...(raw.application ? { application: raw.application } : {}),
  };
}

export function formatCapabilityLevelLabel(level: CapabilityLevel | unknown): string {
  switch (normalizeCapabilityLevel(level)) {
    case "LEVEL_2":
      return "Level 2";
    case "LEVEL_3":
      return "Level 3";
    default:
      return "Level 1";
  }
}

export function buildCapabilityUsageLabel(usage: OrganizerCapabilityUsage, maxConcurrent: number): string {
  return `${usage.activeEventCount} / ${maxConcurrent} aktif etkinlik`;
}

export function buildRemainingSlotsLabel(remainingActiveEventSlots: number): string {
  if (remainingActiveEventSlots <= 0) {
    return "Etkinlik limitine ulaştın";
  }

  return `${remainingActiveEventSlots} etkinlik hakkın kaldı`;
}

export function buildAvailableCreateSubtitle(
  usage: OrganizerCapabilityUsage,
  maxConcurrent: number,
): string {
  if (usage.remainingActiveEventSlots <= 0) {
    return buildRemainingSlotsLabel(0);
  }

  return `${maxConcurrent} etkinlik hakkından ${usage.remainingActiveEventSlots} tanesi kullanılabilir.`;
}

export function buildEventLimitMessage(capabilityLevel: CapabilityLevel, maxConcurrent: number): string {
  return `${formatCapabilityLevelLabel(capabilityLevel)} hesabında aynı anda en fazla ${maxConcurrent} aktif etkinlik oluşturabilirsin.`;
}

export function canCreateEventFromStatus(input: {
  organizerApproved: boolean;
  checkState: ActiveEventCheckState;
}): boolean {
  if (!input.organizerApproved) {
    return false;
  }

  if (input.checkState.status !== "ready") {
    return false;
  }

  return input.checkState.usage.remainingActiveEventSlots > 0;
}

export function resolveOrganizerCapabilityLoadFailureMessage(): string {
  return "Etkinlik hakları yüklenemedi.";
}

export function resolveActiveEventCheckFailureMessage(): string {
  return "Etkinlik hakları yüklenemedi. Lütfen tekrar dene.";
}

export function isOrganizerEventLimitConflict(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 409;
}

export function resolveOrganizerLimitConflictMessage(error: unknown): string | null {
  if (!isOrganizerEventLimitConflict(error)) {
    return null;
  }

  return resolveOrganizerEventLimitMessage(error);
}

export function resolveOrganizerEventLimitMessage(error: unknown): string {
  if (isOrganizerEventLimitConflict(error) && error.message.trim()) {
    return error.message;
  }

  return "Etkinlik oluşturma limitine ulaştın.";
}

export function resolveLimitCardMessage(input: {
  limitConflictMessage: string | null;
  capabilityLevel: CapabilityLevel;
  maxConcurrentActiveEvents: number;
}): string {
  if (input.limitConflictMessage?.trim()) {
    return input.limitConflictMessage.trim();
  }

  return buildEventLimitMessage(input.capabilityLevel, input.maxConcurrentActiveEvents);
}

export type OrganizerLimitConflictMessages = {
  limitConflictMessage: string;
  submitError: string;
};

export function createOrganizerLimitConflictMessages(message: string): OrganizerLimitConflictMessages {
  const resolved = message.trim() || "Etkinlik oluşturma limitine ulaştın.";

  return {
    limitConflictMessage: resolved,
    submitError: resolved,
  };
}

export function resolveOrganizerLimitConflictPresentation(input: {
  limitConflictMessage: string | null;
  submitError: string | null;
  statusRefreshSucceeded: boolean;
  remainingActiveEventSlots: number | null;
}): {
  previewSubmitError: string | null;
  limitCardUsesConflictMessage: boolean;
} {
  const message = input.submitError?.trim() || input.limitConflictMessage?.trim() || null;

  if (!message) {
    return { previewSubmitError: null, limitCardUsesConflictMessage: false };
  }

  if (input.statusRefreshSucceeded && input.remainingActiveEventSlots === 0) {
    return {
      previewSubmitError: null,
      limitCardUsesConflictMessage: true,
    };
  }

  return {
    previewSubmitError: message,
    limitCardUsesConflictMessage: false,
  };
}

export function toActiveEventCheckReadyState(
  status: NormalizedOrganizerCapabilityStatus,
): Extract<ActiveEventCheckState, { status: "ready" }> {
  return {
    status: "ready",
    capabilityLevel: status.capabilityLevel,
    capabilities: status.capabilities,
    usage: status.usage,
    hasActiveEvent: status.hasActiveEvent,
    activeEventTitle: status.activeEventTitle,
  };
}

export function buildMockOrganizerStatusResponse(input?: {
  organizerStatus?: OrganizerStatus;
  capabilityLevel?: CapabilityLevel;
  activeEventCount?: number;
  activeEventTitle?: string | null;
}): OrganizerStatusResponse {
  const capabilityLevel = normalizeCapabilityLevel(input?.capabilityLevel ?? "LEVEL_1");
  const capabilities = CAPABILITY_MATRIX[capabilityLevel];
  const activeEventCount = clampNonNegativeInteger(input?.activeEventCount, 0);
  const usage = normalizeCapabilityUsage(
    capabilities,
    {
      activeEventCount,
      remainingActiveEventSlots: Math.max(0, capabilities.maxConcurrentActiveEvents - activeEventCount),
    },
    activeEventCount > 0,
  );

  return {
    organizerStatus: input?.organizerStatus ?? "approved",
    capabilityLevel,
    capabilities,
    usage,
    hasActiveEvent: usage.activeEventCount > 0,
    ...(input?.activeEventTitle ? { activeEventTitle: input.activeEventTitle } : {}),
  };
}
