import type { EventCreationDraft, EventCreationStep } from "../types/eventCreation";

export type SerializedEventCreationDraft = Omit<EventCreationDraft, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt: string;
};

export type EventCreationSession = {
  draft: SerializedEventCreationDraft;
  step: EventCreationStep;
};

let activeSession: EventCreationSession | null = null;

export function serializeEventCreationDraft(draft: EventCreationDraft): SerializedEventCreationDraft {
  return {
    ...draft,
    startsAt: draft.startsAt.toISOString(),
    endsAt: draft.endsAt.toISOString(),
  };
}

export function deserializeEventCreationDraft(serialized: SerializedEventCreationDraft): EventCreationDraft {
  return {
    ...serialized,
    startsAt: new Date(serialized.startsAt),
    endsAt: new Date(serialized.endsAt),
  };
}

export function getEventCreationSession(): EventCreationSession | null {
  return activeSession;
}

export function hasEventCreationSession(): boolean {
  return activeSession != null;
}

export function saveEventCreationSession(draft: EventCreationDraft, step: EventCreationStep) {
  activeSession = {
    draft: serializeEventCreationDraft(draft),
    step,
  };
}

export function clearEventCreationSession() {
  activeSession = null;
}
