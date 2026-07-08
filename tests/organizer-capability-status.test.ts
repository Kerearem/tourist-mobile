import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ApiRequestError } from "../src/services/api/apiRequestError";
import {
  buildCapabilityUsageLabel,
  buildEventLimitMessage,
  buildMockOrganizerStatusResponse,
  canCreateEventFromStatus,
  createOrganizerLimitConflictMessages,
  formatCapabilityLevelLabel,
  isOrganizerEventLimitConflict,
  LEGACY_LEVEL_1_CAPABILITIES,
  normalizeCapabilityUsage,
  normalizeOrganizerCapabilityStatus,
  resolveLimitCardMessage,
  resolveOrganizerLimitConflictMessage,
  resolveOrganizerLimitConflictPresentation,
  resolveOrganizerEventLimitMessage,
  toActiveEventCheckReadyState,
} from "../src/features/events/utils/organizerCapabilityStatus";
import {
  getMockOrganizerStatusResponse,
  resetMockOrganizerCapabilityConfig,
  setMockOrganizerCapabilityConfig,
} from "../src/features/events/services/organizer-mock-state";

const testsDir = dirname(fileURLToPath(import.meta.url));

function buildReadyState(input: {
  level?: "LEVEL_1" | "LEVEL_2" | "LEVEL_3";
  activeEventCount?: number;
  hasActiveEvent?: boolean;
}) {
  return toActiveEventCheckReadyState(
    normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({
        capabilityLevel: input.level,
        activeEventCount: input.activeEventCount,
      }),
    ),
  );
}

describe("normalizeOrganizerCapabilityStatus", () => {
  it("normalizes full Level 1 response", () => {
    const normalized = normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({ capabilityLevel: "LEVEL_1", activeEventCount: 0 }),
    );

    assert.equal(normalized.capabilityLevel, "LEVEL_1");
    assert.deepEqual(normalized.capabilities, LEGACY_LEVEL_1_CAPABILITIES);
    assert.deepEqual(normalized.usage, { activeEventCount: 0, remainingActiveEventSlots: 1 });
    assert.equal(normalized.hasActiveEvent, false);
  });

  it("normalizes full Level 2 response", () => {
    const normalized = normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({ capabilityLevel: "LEVEL_2", activeEventCount: 2 }),
    );

    assert.equal(normalized.capabilityLevel, "LEVEL_2");
    assert.equal(normalized.capabilities.maxConcurrentActiveEvents, 3);
    assert.deepEqual(normalized.usage, { activeEventCount: 2, remainingActiveEventSlots: 1 });
  });

  it("normalizes full Level 3 response", () => {
    const normalized = normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({ capabilityLevel: "LEVEL_3", activeEventCount: 9 }),
    );

    assert.equal(normalized.capabilityLevel, "LEVEL_3");
    assert.equal(normalized.capabilities.maxConcurrentActiveEvents, 10);
    assert.deepEqual(normalized.usage, { activeEventCount: 9, remainingActiveEventSlots: 1 });
  });

  it("maps legacy hasActiveEvent false to 0/1 usage", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      hasActiveEvent: false,
    });

    assert.equal(normalized.usage.activeEventCount, 0);
    assert.equal(normalized.usage.remainingActiveEventSlots, 1);
  });

  it("maps legacy hasActiveEvent true to 1/0 usage", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      hasActiveEvent: true,
      activeEventTitle: "Yakın Etkinlik",
    });

    assert.equal(normalized.usage.activeEventCount, 1);
    assert.equal(normalized.usage.remainingActiveEventSlots, 0);
    assert.equal(normalized.hasActiveEvent, true);
  });

  it("falls back unknown level to Level 1", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_99" as never,
    });

    assert.equal(normalized.capabilityLevel, "LEVEL_1");
  });

  it("falls back missing capabilities to safe Level 1 defaults", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_2",
    });

    assert.equal(normalized.capabilityLevel, "LEVEL_2");
    assert.deepEqual(normalized.capabilities, LEGACY_LEVEL_1_CAPABILITIES);
    assert.equal(normalized.capabilities.maxConcurrentActiveEvents, 1);
    assert.equal(normalized.capabilities.maxCoHostsPerEvent, 0);
  });

  it("falls back to Level 1 snapshot when one capability field is missing", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_2",
      capabilities: {
        maxConcurrentActiveEvents: 3,
        maxTicketOptionsPerEvent: 3,
        canUseMultipleTicketOptions: true,
        canUsePackageInclusions: true,
        maxCoHostsPerEvent: 2,
      },
    });

    assert.equal(normalized.capabilityLevel, "LEVEL_2");
    assert.deepEqual(normalized.capabilities, LEGACY_LEVEL_1_CAPABILITIES);
  });

  it("keeps full Level 2 snapshot when backend sends a complete capabilities object", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_2",
      capabilities: {
        maxConcurrentActiveEvents: 3,
        maxTicketOptionsPerEvent: 3,
        canUseMultipleTicketOptions: true,
        canUsePackageInclusions: true,
        maxCoHostsPerEvent: 2,
        canUseAdvancedAnalytics: true,
      },
      usage: { activeEventCount: 1, remainingActiveEventSlots: 2 },
    });

    assert.equal(normalized.capabilities.maxConcurrentActiveEvents, 3);
    assert.equal(normalized.capabilities.maxCoHostsPerEvent, 2);
  });

  it("keeps full Level 3 snapshot when backend sends a complete capabilities object", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_3",
      capabilities: {
        maxConcurrentActiveEvents: 10,
        maxTicketOptionsPerEvent: 10,
        canUseMultipleTicketOptions: true,
        canUsePackageInclusions: true,
        maxCoHostsPerEvent: 10,
        canUseAdvancedAnalytics: true,
      },
      usage: { activeEventCount: 4, remainingActiveEventSlots: 6 },
    });

    assert.equal(normalized.capabilities.maxConcurrentActiveEvents, 10);
    assert.equal(normalized.usage.remainingActiveEventSlots, 6);
  });

  it("rejects non-integer capability limits and falls back to Level 1", () => {
    const base = {
      organizerStatus: "approved" as const,
      capabilityLevel: "LEVEL_2" as const,
      canUseMultipleTicketOptions: true,
      canUsePackageInclusions: true,
      canUseAdvancedAnalytics: true,
    };

    assert.deepEqual(
      normalizeOrganizerCapabilityStatus({
        ...base,
        capabilities: {
          maxConcurrentActiveEvents: 3.5,
          maxTicketOptionsPerEvent: 3,
          maxCoHostsPerEvent: 2,
          canUseMultipleTicketOptions: true,
          canUsePackageInclusions: true,
          canUseAdvancedAnalytics: true,
        },
      }).capabilities,
      LEGACY_LEVEL_1_CAPABILITIES,
    );

    assert.deepEqual(
      normalizeOrganizerCapabilityStatus({
        ...base,
        capabilities: {
          maxConcurrentActiveEvents: 3,
          maxTicketOptionsPerEvent: 2.5,
          maxCoHostsPerEvent: 2,
          canUseMultipleTicketOptions: true,
          canUsePackageInclusions: true,
          canUseAdvancedAnalytics: true,
        },
      }).capabilities,
      LEGACY_LEVEL_1_CAPABILITIES,
    );

    assert.deepEqual(
      normalizeOrganizerCapabilityStatus({
        ...base,
        capabilities: {
          maxConcurrentActiveEvents: 3,
          maxTicketOptionsPerEvent: 3,
          maxCoHostsPerEvent: -0.5,
          canUseMultipleTicketOptions: true,
          canUsePackageInclusions: true,
          canUseAdvancedAnalytics: true,
        },
      }).capabilities,
      LEGACY_LEVEL_1_CAPABILITIES,
    );
  });

  it("rejects NaN, Infinity, and numeric strings in capability limits", () => {
    const completeExcept = (overrides: Partial<{
      maxConcurrentActiveEvents: unknown;
      maxTicketOptionsPerEvent: unknown;
      maxCoHostsPerEvent: unknown;
    }>) =>
      normalizeOrganizerCapabilityStatus({
        organizerStatus: "approved",
        capabilityLevel: "LEVEL_2",
        capabilities: {
          maxConcurrentActiveEvents: 3,
          maxTicketOptionsPerEvent: 3,
          canUseMultipleTicketOptions: true,
          canUsePackageInclusions: true,
          maxCoHostsPerEvent: 2,
          canUseAdvancedAnalytics: true,
          ...overrides,
        } as never,
      }).capabilities;

    assert.deepEqual(completeExcept({ maxConcurrentActiveEvents: Number.NaN }), LEGACY_LEVEL_1_CAPABILITIES);
    assert.deepEqual(completeExcept({ maxConcurrentActiveEvents: Number.POSITIVE_INFINITY }), LEGACY_LEVEL_1_CAPABILITIES);
    assert.deepEqual(completeExcept({ maxTicketOptionsPerEvent: "3" }), LEGACY_LEVEL_1_CAPABILITIES);
  });

  it("does not increase backend remainingActiveEventSlots=0 from local calculation", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_2",
      capabilities: {
        maxConcurrentActiveEvents: 3,
        maxTicketOptionsPerEvent: 3,
        canUseMultipleTicketOptions: true,
        canUsePackageInclusions: true,
        maxCoHostsPerEvent: 2,
        canUseAdvancedAnalytics: true,
      },
      usage: { activeEventCount: 2, remainingActiveEventSlots: 0 },
      hasActiveEvent: false,
    });

    assert.equal(normalized.usage.remainingActiveEventSlots, 0);
    assert.equal(normalized.hasActiveEvent, true);
  });
});

describe("normalizeCapabilityUsage", () => {
  const level2Capabilities = {
    maxConcurrentActiveEvents: 3,
    maxTicketOptionsPerEvent: 3,
    canUseMultipleTicketOptions: true,
    canUsePackageInclusions: true,
    maxCoHostsPerEvent: 2,
    canUseAdvancedAnalytics: true,
  };

  it("caps remaining slots with derived usage when backend reports more than local allowance", () => {
    const usage = normalizeCapabilityUsage(
      level2Capabilities,
      { activeEventCount: 2, remainingActiveEventSlots: 3 },
      false,
    );

    assert.deepEqual(usage, { activeEventCount: 2, remainingActiveEventSlots: 1 });
  });

  it("returns zero remaining when active count exceeds max concurrent slots", () => {
    const usage = normalizeCapabilityUsage(
      level2Capabilities,
      { activeEventCount: 5, remainingActiveEventSlots: 2 },
      false,
    );

    assert.deepEqual(usage, { activeEventCount: 5, remainingActiveEventSlots: 0 });
  });

  it("never increases backend remaining=0", () => {
    const usage = normalizeCapabilityUsage(
      level2Capabilities,
      { activeEventCount: 1, remainingActiveEventSlots: 0 },
      false,
    );

    assert.equal(usage.remainingActiveEventSlots, 0);
  });

  it("clamps negative usage values and derives hasActiveEvent from normalized active count", () => {
    const normalized = normalizeOrganizerCapabilityStatus({
      organizerStatus: "approved",
      capabilityLevel: "LEVEL_2",
      capabilities: level2Capabilities,
      usage: { activeEventCount: -2, remainingActiveEventSlots: -1 },
    });

    assert.equal(normalized.usage.activeEventCount, 0);
    assert.equal(normalized.usage.remainingActiveEventSlots, 0);
    assert.equal(normalized.hasActiveEvent, false);
  });
});

describe("create decisions from capability status", () => {
  it("allows Level 1 when count is 0", () => {
    const state = buildReadyState({ level: "LEVEL_1", activeEventCount: 0 });
    assert.equal(canCreateEventFromStatus({ organizerApproved: true, checkState: state }), true);
  });

  it("blocks Level 1 when count is 1", () => {
    const state = buildReadyState({ level: "LEVEL_1", activeEventCount: 1 });
    assert.equal(canCreateEventFromStatus({ organizerApproved: true, checkState: state }), false);
  });

  it("allows Level 2 when count is 1 or 2", () => {
    assert.equal(
      canCreateEventFromStatus({
        organizerApproved: true,
        checkState: buildReadyState({ level: "LEVEL_2", activeEventCount: 1 }),
      }),
      true,
    );
    assert.equal(
      canCreateEventFromStatus({
        organizerApproved: true,
        checkState: buildReadyState({ level: "LEVEL_2", activeEventCount: 2 }),
      }),
      true,
    );
  });

  it("blocks Level 2 when count is 3", () => {
    const state = buildReadyState({ level: "LEVEL_2", activeEventCount: 3 });
    assert.equal(canCreateEventFromStatus({ organizerApproved: true, checkState: state }), false);
  });

  it("allows Level 3 when count is 9 and blocks at 10", () => {
    assert.equal(
      canCreateEventFromStatus({
        organizerApproved: true,
        checkState: buildReadyState({ level: "LEVEL_3", activeEventCount: 9 }),
      }),
      true,
    );
    assert.equal(
      canCreateEventFromStatus({
        organizerApproved: true,
        checkState: buildReadyState({ level: "LEVEL_3", activeEventCount: 10 }),
      }),
      false,
    );
  });

  it("blocks create while loading or on error", () => {
    assert.equal(
      canCreateEventFromStatus({ organizerApproved: true, checkState: { status: "loading" } }),
      false,
    );
    assert.equal(
      canCreateEventFromStatus({
        organizerApproved: true,
        checkState: { status: "error", message: "fail" },
      }),
      false,
    );
  });

  it("allows create when hasActiveEvent is true but remaining slot exists", () => {
    const state = buildReadyState({ level: "LEVEL_2", activeEventCount: 1 });
    assert.equal(state.hasActiveEvent, true);
    assert.equal(canCreateEventFromStatus({ organizerApproved: true, checkState: state }), true);
  });
});

describe("capability labels and messages", () => {
  it("formats level labels", () => {
    assert.equal(formatCapabilityLevelLabel("LEVEL_1"), "Level 1");
    assert.equal(formatCapabilityLevelLabel("LEVEL_2"), "Level 2");
    assert.equal(formatCapabilityLevelLabel("LEVEL_3"), "Level 3");
    assert.equal(formatCapabilityLevelLabel("UNKNOWN"), "Level 1");
  });

  it("formats usage label", () => {
    assert.equal(buildCapabilityUsageLabel({ activeEventCount: 2, remainingActiveEventSlots: 1 }, 3), "2 / 3 aktif etkinlik");
  });

  it("formats level-specific limit message", () => {
    assert.match(buildEventLimitMessage("LEVEL_2", 3), /Level 2 hesabında aynı anda en fazla 3 aktif/);
  });
});

describe("409 conflict detection", () => {
  it("detects ApiRequestError status 409", () => {
    const error = new ApiRequestError("Etkinlik oluşturma limitine ulaştın.", 409);
    assert.equal(isOrganizerEventLimitConflict(error), true);
    assert.equal(resolveOrganizerEventLimitMessage(error), "Etkinlik oluşturma limitine ulaştın.");
    assert.equal(resolveOrganizerLimitConflictMessage(error), "Etkinlik oluşturma limitine ulaştın.");
  });

  it("does not treat plain Error with 409 text as conflict", () => {
    const error = new Error("409 conflict");
    assert.equal(isOrganizerEventLimitConflict(error), false);
    assert.equal(resolveOrganizerEventLimitMessage(error), "Etkinlik oluşturma limitine ulaştın.");
    assert.equal(resolveOrganizerLimitConflictMessage(error), null);
  });

  it("falls back when 409 message is empty", () => {
    const error = new ApiRequestError("   ", 409);
    assert.equal(resolveOrganizerEventLimitMessage(error), "Etkinlik oluşturma limitine ulaştın.");
  });
});

describe("limit card message resolution", () => {
  it("prefers stored 409 conflict message over generic limit copy", () => {
    assert.equal(
      resolveLimitCardMessage({
        limitConflictMessage: "Backend limit mesajı",
        capabilityLevel: "LEVEL_2",
        maxConcurrentActiveEvents: 3,
      }),
      "Backend limit mesajı",
    );
  });

  it("falls back to generic limit copy when conflict message is empty", () => {
    assert.match(
      resolveLimitCardMessage({
        limitConflictMessage: "   ",
        capabilityLevel: "LEVEL_2",
        maxConcurrentActiveEvents: 3,
      }),
      /Level 2 hesabında aynı anda en fazla 3 aktif/,
    );
  });
});

describe("409 limit conflict message presentation", () => {
  it("writes the same backend message to both presentation channels", () => {
    const messages = createOrganizerLimitConflictMessages("Backend limit mesajı");

    assert.deepEqual(messages, {
      limitConflictMessage: "Backend limit mesajı",
      submitError: "Backend limit mesajı",
    });
  });

  it("routes refresh success with zero remaining slots to the limit card channel", () => {
    const messages = createOrganizerLimitConflictMessages("Backend limit mesajı");

    assert.deepEqual(
      resolveOrganizerLimitConflictPresentation({
        ...messages,
        statusRefreshSucceeded: true,
        remainingActiveEventSlots: 0,
      }),
      {
        previewSubmitError: null,
        limitCardUsesConflictMessage: true,
      },
    );

    assert.equal(
      resolveLimitCardMessage({
        limitConflictMessage: messages.limitConflictMessage,
        capabilityLevel: "LEVEL_2",
        maxConcurrentActiveEvents: 3,
      }),
      "Backend limit mesajı",
    );
  });

  it("keeps preview submit error when status refresh fails", () => {
    const messages = createOrganizerLimitConflictMessages("Backend limit mesajı");

    assert.deepEqual(
      resolveOrganizerLimitConflictPresentation({
        ...messages,
        statusRefreshSucceeded: false,
        remainingActiveEventSlots: 1,
      }),
      {
        previewSubmitError: "Backend limit mesajı",
        limitCardUsesConflictMessage: false,
      },
    );
  });
});

describe("TicketsStep regression", () => {
  it("does not expose multi-ticket UI or fixed single-option copy", () => {
    const source = readFileSync(
      join(testsDir, "../src/features/events/components/create-event/steps/TicketsStep.tsx"),
      "utf8",
    );

    assert.doesNotMatch(source, /1 bilet seçeneği/);
    assert.doesNotMatch(source, /canUseMultipleTicketOptions/);
    assert.doesNotMatch(source, /eventCreationCapabilities/);
  });
});

describe("mock organizer status fixtures", () => {
  it("returns normalized Level 1 mock without active events", () => {
    const normalized = normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({ capabilityLevel: "LEVEL_1", activeEventCount: 0 }),
    );

    assert.equal(normalized.capabilityLevel, "LEVEL_1");
    assert.equal(normalized.usage.activeEventCount, 0);
    assert.equal(normalized.usage.remainingActiveEventSlots, 1);
  });

  it("supports Level 2 active fixture", () => {
    const normalized = normalizeOrganizerCapabilityStatus(
      buildMockOrganizerStatusResponse({ capabilityLevel: "LEVEL_2", activeEventCount: 2 }),
    );

    assert.equal(normalized.capabilityLevel, "LEVEL_2");
    assert.equal(normalized.usage.remainingActiveEventSlots, 1);
  });

  it("applies mock capability config through getMockOrganizerStatusResponse", () => {
    resetMockOrganizerCapabilityConfig();
    setMockOrganizerCapabilityConfig({ capabilityLevel: "LEVEL_2", activeEventCount: 2 });

    const normalized = normalizeOrganizerCapabilityStatus(getMockOrganizerStatusResponse());

    assert.equal(normalized.capabilityLevel, "LEVEL_2");
    assert.deepEqual(normalized.usage, { activeEventCount: 2, remainingActiveEventSlots: 1 });

    resetMockOrganizerCapabilityConfig();
  });
});
