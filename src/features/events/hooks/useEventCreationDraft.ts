import { useCallback, useMemo, useReducer, useRef } from "react";

import type { EventCreationDraft } from "../types/eventCreation";
import { hasUnsavedDraftChanges, resolveEndDateAfterStartChange } from "../utils/eventCreationValidation";

export { createInitialEventCreationDraft } from "../utils/eventCreationDraft";

type DraftAction =
  | { type: "patch"; patch: Partial<EventCreationDraft> }
  | { type: "set_starts_at"; startsAt: Date }
  | { type: "reset"; draft: EventCreationDraft };

function draftReducer(state: EventCreationDraft, action: DraftAction): EventCreationDraft {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "set_starts_at":
      return {
        ...state,
        startsAt: action.startsAt,
        endsAt: resolveEndDateAfterStartChange(action.startsAt, state.endsAt),
      };
    case "reset":
      return action.draft;
    default:
      return state;
  }
}

export function useEventCreationDraft(initialDraft: EventCreationDraft) {
  const initialRef = useRef(initialDraft);
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);

  const patchDraft = useCallback((patch: Partial<EventCreationDraft>) => {
    dispatch({ type: "patch", patch });
  }, []);

  const setStartsAt = useCallback((startsAt: Date) => {
    dispatch({ type: "set_starts_at", startsAt });
  }, []);

  const resetDraft = useCallback((nextDraft: EventCreationDraft) => {
    initialRef.current = nextDraft;
    dispatch({ type: "reset", draft: nextDraft });
  }, []);

  const isDirty = useMemo(
    () => hasUnsavedDraftChanges(initialRef.current, draft),
    [draft],
  );

  return {
    draft,
    patchDraft,
    setStartsAt,
    resetDraft,
    isDirty,
    initialDraft: initialRef.current,
  };
}
