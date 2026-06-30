import type { CreateReelInput, ReelItem } from "../types/reels";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

export async function createOrganizerReel(input: CreateReelInput): Promise<ReelItem> {
  if (USE_MOCK_BACKEND) {
    return {
      id: `reel_${Date.now()}`,
      caption: input.caption ?? null,
      eventId: input.eventId ?? null,
      event: null,
      createdAt: new Date().toISOString(),
      media: input.media.map((item, index) => ({
        id: `reel_media_${index}`,
        url: item.url,
        type: item.type,
        order: item.order,
      })),
    };
  }

  const token = await getAccessToken();
  return apiRequest<ReelItem>(API_ENDPOINTS.organizer.reels, {
    method: "POST",
    token,
    body: input,
  });
}

const withUserIdParam = (template: string, userId: string) => template.replace(":userId", userId);
const withReelIdParam = (template: string, reelId: string) => template.replace(":reelId", reelId);

export async function getOrganizerReels(userId: string): Promise<ReelItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<ReelItem[]>(withUserIdParam(API_ENDPOINTS.users.organizerReels, userId), {
    method: "GET",
    token,
  });
}

export async function deleteOrganizerReel(reelId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withReelIdParam(API_ENDPOINTS.organizer.reel, reelId), {
    method: "DELETE",
    token,
  });
}
