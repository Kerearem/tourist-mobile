import type { ReelCommentItem, ReelLikeResult } from "../types/reelEngagement";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { ApiRequestError, apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const withReelPath = (template: string, reelId: string) => template.replace(":reelId", reelId);

export async function likeReel(reelId: string): Promise<ReelLikeResult> {
  const token = await getAccessToken();
  return apiRequest<ReelLikeResult>(withReelPath(API_ENDPOINTS.reels.like, reelId), {
    method: "POST",
    token,
  });
}

export async function unlikeReel(reelId: string): Promise<ReelLikeResult> {
  const token = await getAccessToken();
  return apiRequest<ReelLikeResult>(withReelPath(API_ENDPOINTS.reels.like, reelId), {
    method: "DELETE",
    token,
  });
}

export async function getReelComments(reelId: string): Promise<ReelCommentItem[]> {
  const token = await getAccessToken();
  return apiRequest<ReelCommentItem[]>(withReelPath(API_ENDPOINTS.reels.comments, reelId), {
    method: "GET",
    token,
  });
}

export async function addReelComment(reelId: string, text: string): Promise<ReelCommentItem[]> {
  const token = await getAccessToken();
  return apiRequest<ReelCommentItem[]>(withReelPath(API_ENDPOINTS.reels.comments, reelId), {
    method: "POST",
    token,
    body: { text },
  });
}

export async function toggleReelLike(reelId: string, currentlyLiked: boolean): Promise<ReelLikeResult> {
  try {
    return currentlyLiked ? await unlikeReel(reelId) : await likeReel(reelId);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 409) {
      return likeReel(reelId);
    }
    throw error;
  }
}
