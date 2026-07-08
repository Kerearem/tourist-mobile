export const CONVERSATION_SEARCH_DEBOUNCE_MS = 300;
export const CONVERSATION_SEARCH_MIN_LENGTH = 2;
export const CONVERSATION_MEDIA_ERROR_MESSAGE = "Ortak medya yüklenemedi." as const;

export function normalizeConversationSearchQuery(query: string): string {
  return query.trim();
}

export function shouldExecuteConversationSearch(query: string): boolean {
  return normalizeConversationSearchQuery(query).length >= CONVERSATION_SEARCH_MIN_LENGTH;
}

export function beginConversationSearchRequest(currentRequestId: number): number {
  return currentRequestId + 1;
}

export function shouldApplyConversationSearchResponse(
  activeRequestId: number,
  responseRequestId: number,
): boolean {
  return activeRequestId === responseRequestId;
}

export function shouldInvalidateConversationSearch(query: string, isSearchOpen: boolean): boolean {
  return !isSearchOpen || !shouldExecuteConversationSearch(query);
}

export function createInvalidatedConversationSearchState() {
  return {
    searchResults: [],
    searchError: null,
    isSearching: false,
  };
}

export function resolveConversationInfoMediaFailure() {
  return {
    mediaError: CONVERSATION_MEDIA_ERROR_MESSAGE,
    globalError: null,
  };
}
