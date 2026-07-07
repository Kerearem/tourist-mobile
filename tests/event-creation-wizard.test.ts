import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EVENT_CREATION_STEPS, EVENT_CREATION_STEP_TITLES } from "../src/features/events/types/eventCreation";
import { createInitialEventCreationDraft } from "../src/features/events/utils/eventCreationDraft";
import { DEFAULT_EVENT_CREATION_CAPABILITIES } from "../src/features/events/utils/eventCreationCapabilities";
import {
  buildCreateEventPayload,
  shouldUploadCoverOnSubmit,
} from "../src/features/events/utils/eventCreationPayload";
import {
  EVENT_CREATION_EXIT_ALERT,
  resolveEventCreationExitDecision,
  shouldPreventNavigationRemoval,
} from "../src/features/events/utils/eventCreationNavigation";
import {
  EVENT_CAPACITY_OVER_LIMIT_MESSAGE,
  hasUnsavedDraftChanges,
  MAX_EVENT_CAPACITY,
  parseCapacityInput,
  resolveActiveEventCheckFailureMessage,
  resolveCapacityInput,
  resolveCapacityValidationError,
  resolveEndDateAfterStartChange,
  resolveEventCreationStepState,
  resolveFirstInvalidStep,
  shouldAllowCreateAfterActiveEventCheck,
  shouldBlockExitForUnsavedChanges,
  validateCompleteEventDraft,
  validateEventCreationStep,
} from "../src/features/events/utils/eventCreationValidation";
import { isEventMinAgeAllowedForOrganizer } from "../src/features/events/utils/viewerAge";

const baseNow = new Date("2026-07-01T12:00:00.000Z");

function buildValidDraft() {
  const draft = createInitialEventCreationDraft({ city: "İstanbul", countryCode: "TR" });
  draft.title = "Test Etkinliği";
  draft.description = "Bu etkinlik test amaçlı açıklama metnidir.";
  draft.eventType = "social";
  draft.startsAt = new Date(2026, 7, 1, 18, 0, 0, 0);
  draft.endsAt = new Date(2026, 7, 1, 20, 0, 0, 0);
  draft.venueName = "Test Mekan";
  draft.capacityInput = "40";
  draft.visibility = "city";
  draft.ticketMode = "free";
  draft.tokenPriceInput = "";
  draft.timezone = "Europe/Istanbul";
  return draft;
}

describe("event creation wizard steps", () => {
  it("defines five ordered steps with Turkish titles", () => {
    assert.deepEqual(EVENT_CREATION_STEPS, [1, 2, 3, 4, 5]);
    assert.equal(EVENT_CREATION_STEP_TITLES[1], "Temel Bilgiler");
    assert.equal(EVENT_CREATION_STEP_TITLES[5], "Önizleme");
  });

  it("isolates step validation", () => {
    const draft = buildValidDraft();
    const context = { now: baseNow, organizerAge: 25 };

    assert.equal(Object.keys(validateEventCreationStep(1, draft, context)).length, 0);
    assert.equal(Object.keys(validateEventCreationStep(4, { ...draft, ticketMode: "token", tokenPriceInput: "" }, context)).length, 1);
  });
});

describe("event creation field validation", () => {
  const context = { now: baseNow, organizerAge: 25 };

  it("enforces title and description bounds", () => {
    const draft = { ...buildValidDraft(), title: "ab", description: "kısa" };
    const errors = validateEventCreationStep(1, draft, context);
    assert.match(errors.title ?? "", /3 karakter/);
    assert.match(errors.description ?? "", /10 karakter/);
  });

  it("rejects past start dates", () => {
    const draft = buildValidDraft();
    draft.startsAt = new Date(2026, 5, 1, 18, 0, 0, 0);
    draft.endsAt = new Date(2026, 5, 1, 20, 0, 0, 0);
    const errors = validateEventCreationStep(2, draft, context);
    assert.match(errors.startsAt ?? "", /geçmişte/);
  });

  it("requires end after start", () => {
    const draft = buildValidDraft();
    draft.endsAt = new Date(draft.startsAt);
    const errors = validateEventCreationStep(2, draft, context);
    assert.match(errors.endsAt ?? "", /sonra/);
  });

  it("adjusts end date when start moves beyond current end", () => {
    const start = new Date("2026-08-01T18:00:00.000Z");
    const end = new Date("2026-08-01T19:00:00.000Z");
    const nextEnd = resolveEndDateAfterStartChange(new Date("2026-08-01T20:00:00.000Z"), end, baseNow);
    assert.equal(nextEnd > new Date("2026-08-01T20:00:00.000Z"), true);
    assert.equal(resolveEndDateAfterStartChange(start, end, baseNow).getTime(), end.getTime());
  });

  it("validates venue and location", () => {
    const draft = { ...buildValidDraft(), venueName: "A", city: "", countryCode: "" };
    const errors = validateEventCreationStep(2, draft, context);
    assert.match(errors.venueName ?? "", /2 karakter/);
    assert.match(errors.location ?? "", /Şehir/);
  });

  it("requires positive integer capacity", () => {
    assert.equal(parseCapacityInput("25"), 25);
    assert.equal(parseCapacityInput("0"), null);
    assert.equal(parseCapacityInput("1.5"), null);
    const errors = validateEventCreationStep(3, { ...buildValidDraft(), capacityInput: "0" }, context);
    assert.match(errors.capacity ?? "", /kapasite/);
  });

  it("enforces PostgreSQL int4 capacity upper bound", () => {
    assert.equal(parseCapacityInput("1"), 1);
    assert.equal(parseCapacityInput(String(MAX_EVENT_CAPACITY)), MAX_EVENT_CAPACITY);
    assert.equal(parseCapacityInput(String(MAX_EVENT_CAPACITY + 1)), null);

    const overLimit = resolveCapacityInput(String(MAX_EVENT_CAPACITY + 1));
    assert.equal(overLimit.ok, false);
    if (!overLimit.ok) {
      assert.equal(overLimit.reason, "over_limit");
    }

    assert.equal(resolveCapacityValidationError(String(MAX_EVENT_CAPACITY + 1)), EVENT_CAPACITY_OVER_LIMIT_MESSAGE);
    assert.equal(parseCapacityInput("-5"), null);

    const stepErrors = validateEventCreationStep(
      3,
      { ...buildValidDraft(), capacityInput: String(MAX_EVENT_CAPACITY + 1) },
      context,
    );
    assert.equal(stepErrors.capacity, EVENT_CAPACITY_OVER_LIMIT_MESSAGE);
  });

  it("requires event type", () => {
    const errors = validateEventCreationStep(1, { ...buildValidDraft(), eventType: null }, context);
    assert.match(errors.eventType ?? "", /türü/);
  });

  it("validates token price and free payload", () => {
    const freeDraft = buildValidDraft();
    const freePayload = buildCreateEventPayload(freeDraft, 40);
    assert.equal(freePayload.ok, true);
    if (freePayload.ok) {
      assert.equal(freePayload.payload.tokenPrice, 0);
      assert.equal(freePayload.payload.isPaid, false);
    }

    const tokenDraft = { ...buildValidDraft(), ticketMode: "token" as const, tokenPriceInput: "12" };
    const tokenErrors = validateEventCreationStep(4, tokenDraft, context);
    assert.equal(Object.keys(tokenErrors).length, 0);
    const tokenPayload = buildCreateEventPayload(tokenDraft, 40);
    assert.equal(tokenPayload.ok, true);
    if (tokenPayload.ok) {
      assert.equal(tokenPayload.payload.isPaid, true);
      assert.equal(tokenPayload.payload.tokenPrice, 12);
    }
  });

  it("enforces age and alcohol rules", () => {
    const draft = { ...buildValidDraft(), minAge: null, hasAlcohol: true };
    const errors = validateEventCreationStep(3, draft, context);
    assert.match(errors.hasAlcohol ?? "", /yaş sınırı/);

    assert.equal(isEventMinAgeAllowedForOrganizer(20, 21), false);
    const ageErrors = validateEventCreationStep(3, { ...buildValidDraft(), minAge: 21 }, { ...context, organizerAge: 20 });
    assert.match(ageErrors.minAge ?? "", /Kendi yaşından/);
  });

  it("accepts city and country visibility values", () => {
    const cityDraft = { ...buildValidDraft(), visibility: "city" as const };
    const countryDraft = { ...buildValidDraft(), visibility: "country" as const };
    assert.equal(Object.keys(validateEventCreationStep(3, cityDraft, context)).length, 0);
    assert.equal(Object.keys(validateEventCreationStep(3, countryDraft, context)).length, 0);
    const cityPayload = buildCreateEventPayload(cityDraft, 40);
    const countryPayload = buildCreateEventPayload(countryDraft, 40);
    assert.equal(cityPayload.ok && cityPayload.payload.visibility, "city");
    assert.equal(countryPayload.ok && countryPayload.payload.visibility, "country");
  });
});

describe("event creation payload and timezone", () => {
  it("rejects payload when timezone is missing", () => {
    const draft = buildValidDraft();
    draft.timezone = "";
    const result = buildCreateEventPayload(draft, 40);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "timezone");
    }
  });

  it("builds final payload with all required fields", () => {
    const draft = buildValidDraft();
    const result = buildCreateEventPayload(draft, 40);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.title, "Test Etkinliği");
      assert.equal(result.payload.capacity, 40);
      assert.equal(result.payload.requiresApproval, false);
      assert.equal(result.payload.hasAlcohol, false);
      assert.equal(result.payload.smokingAllowed, false);
      assert.equal(result.payload.type, "social");
      assert.equal(result.payload.timezone, "Europe/Istanbul");
    }
  });

  it("uploads cover only when cover uri exists", () => {
    const draft = buildValidDraft();
    assert.equal(shouldUploadCoverOnSubmit(draft), false);
    draft.coverUri = "file:///cover.jpg";
    assert.equal(shouldUploadCoverOnSubmit(draft), true);
  });
});

describe("event creation navigation helpers", () => {
  const context = { now: baseNow, organizerAge: 25 };

  it("resolves first invalid step", () => {
    const draft = buildValidDraft();
    draft.title = "";
    assert.equal(resolveFirstInvalidStep(draft, context), 1);

    draft.title = "Geçerli Başlık";
    draft.capacityInput = "";
    assert.equal(resolveFirstInvalidStep(draft, context), 3);
  });

  it("tracks completed steps from validation", () => {
    const draft = buildValidDraft();
    const state = resolveEventCreationStepState(draft, context, 3);
    assert.deepEqual(state.completedSteps, [1, 2]);
    assert.equal(state.canProceed, true);
  });

  it("detects unsaved changes and exit blocking", () => {
    const initial = createInitialEventCreationDraft();
    const changed = { ...initial, title: "Yeni" };
    assert.equal(hasUnsavedDraftChanges(initial, changed), true);
    assert.equal(
      shouldBlockExitForUnsavedChanges({ isDirty: true, isSubmitting: false }),
      true,
    );
    assert.equal(
      shouldBlockExitForUnsavedChanges({ isDirty: true, isSubmitting: true }),
      false,
    );
    assert.equal(
      shouldBlockExitForUnsavedChanges({ isDirty: false, isSubmitting: false }),
      false,
    );
    assert.equal(
      shouldBlockExitForUnsavedChanges({
        isDirty: true,
        isSubmitting: false,
        allowNavigationAfterSuccess: true,
      }),
      false,
    );
  });
});

describe("event creation exit navigation", () => {
  it("allows clean drafts and successful submissions to exit", () => {
    assert.equal(
      resolveEventCreationExitDecision({ isDirty: false, isSubmitting: false, allowNavigationAfterSuccess: false }),
      "allow",
    );
    assert.equal(
      resolveEventCreationExitDecision({ isDirty: true, isSubmitting: false, allowNavigationAfterSuccess: true }),
      "allow",
    );
  });

  it("blocks exit while submitting", () => {
    assert.equal(
      resolveEventCreationExitDecision({ isDirty: true, isSubmitting: true, allowNavigationAfterSuccess: false }),
      "block",
    );
    assert.equal(
      shouldPreventNavigationRemoval(
        resolveEventCreationExitDecision({ isDirty: false, isSubmitting: true, allowNavigationAfterSuccess: false }),
      ),
      true,
    );
  });

  it("confirms exit for dirty drafts when not submitting", () => {
    assert.equal(
      resolveEventCreationExitDecision({ isDirty: true, isSubmitting: false, allowNavigationAfterSuccess: false }),
      "confirm",
    );
    assert.equal(
      shouldPreventNavigationRemoval(
        resolveEventCreationExitDecision({ isDirty: true, isSubmitting: false, allowNavigationAfterSuccess: false }),
      ),
      true,
    );
    assert.equal(EVENT_CREATION_EXIT_ALERT.stayLabel, "Devam Et");
    assert.equal(EVENT_CREATION_EXIT_ALERT.leaveLabel, "Çık");
  });
});

describe("active event limit checks", () => {
  it("fails closed when active event check errors", () => {
    assert.equal(
      shouldAllowCreateAfterActiveEventCheck({ status: "error" }),
      false,
    );
    assert.equal(
      shouldAllowCreateAfterActiveEventCheck({ status: "ready", hasActiveEvent: true }),
      false,
    );
    assert.equal(
      shouldAllowCreateAfterActiveEventCheck({ status: "ready", hasActiveEvent: false }),
      true,
    );
    assert.match(resolveActiveEventCheckFailureMessage(), /kontrol edilemedi/);
  });
});

describe("event creation capabilities defaults", () => {
  it("keeps single ticket model for this phase", () => {
    assert.equal(DEFAULT_EVENT_CREATION_CAPABILITIES.maxTicketOptionsPerEvent, 1);
    assert.equal(DEFAULT_EVENT_CREATION_CAPABILITIES.canUseMultipleTicketOptions, false);
    assert.equal(DEFAULT_EVENT_CREATION_CAPABILITIES.canUsePackageInclusions, false);
  });
});

describe("complete draft validation", () => {
  it("passes for a fully valid draft", () => {
    const errors = validateCompleteEventDraft(buildValidDraft(), { now: baseNow, organizerAge: 25 });
    assert.equal(Object.keys(errors).length, 0);
  });
});
