import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type SearchUserResult = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOrganizer: boolean;
};

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

export async function searchUsers(query: string): Promise<SearchUserResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  const params = new URLSearchParams({ q: trimmed });
  return apiRequest<SearchUserResult[]>(`${API_ENDPOINTS.users.search}?${params.toString()}`, {
    method: "GET",
    token,
  });
}
