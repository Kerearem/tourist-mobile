import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type UserPublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  countryCode?: string;
  accountType: "personal" | "business";
  isOrganizer: boolean;
  verificationBadge?: "organizer" | "business";
};

export type UserProfileStats = {
  helped: number;
  events: number;
  organized: number;
};

const withUserIdParam = (template: string, userId: string) => template.replace(":userId", userId);

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

export async function getUserPublicProfile(userId: string): Promise<UserPublicProfile> {
  if (USE_MOCK_BACKEND) {
    return {
      id: userId,
      username: "tourist",
      displayName: "Tourist Member",
      accountType: "personal",
      isOrganizer: false,
    };
  }

  const token = await getAccessToken();
  return apiRequest<UserPublicProfile>(withUserIdParam(API_ENDPOINTS.users.publicProfile, userId), {
    method: "GET",
    token,
  });
}

export async function getUserProfileStats(userId: string): Promise<UserProfileStats> {
  if (USE_MOCK_BACKEND) {
    return { helped: 0, events: 0, organized: 0 };
  }

  const token = await getAccessToken();
  return apiRequest<UserProfileStats>(withUserIdParam(API_ENDPOINTS.users.profileStats, userId), {
    method: "GET",
    token,
  });
}
