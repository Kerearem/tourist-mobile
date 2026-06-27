import type { CreateSnapInput, SnapItem } from "../types";
import type { SnapCommentItem, SnapCommentLikeResult, SnapLikeResult } from "../../explore/types";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { ApiRequestError, apiRequest } from "../../../services/api/client";

const SNAP_DAILY_LIMIT_MESSAGE = "Bugün zaten bir Snap paylaştın";

const getAccessToken = async () => {
  const hydrated = await hydrateAuthState();
  if (!hydrated) {
    throw new Error("Oturum süresi doldu. Lütfen çıkış yapıp tekrar giriş yap.");
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

const withUserId = (template: string, userId: string) => template.replace(":userId", userId);
const withSnapId = (template: string, snapId: string) => template.replace(":snapId", snapId);
const withCommentId = (template: string, commentId: string) => template.replace(":commentId", commentId);

const formatSnapApiError = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) {
      return SNAP_DAILY_LIMIT_MESSAGE;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Snap işlemi başarısız oldu.";
};

export async function createSnap(input: CreateSnapInput): Promise<SnapItem> {
  const token = await getAccessToken();

  try {
    return await apiRequest<SnapItem>(API_ENDPOINTS.snaps.create, {
      method: "POST",
      body: input,
      token,
    });
  } catch (error) {
    throw new Error(formatSnapApiError(error));
  }
}

export async function getMySnaps(): Promise<SnapItem[]> {
  const token = await getAccessToken();
  return apiRequest<SnapItem[]>(API_ENDPOINTS.snaps.me, {
    method: "GET",
    token,
  });
}

export async function getSnapsByUser(userId: string): Promise<SnapItem[]> {
  const token = await getAccessToken();
  return apiRequest<SnapItem[]>(withUserId(API_ENDPOINTS.snaps.byUser, userId), {
    method: "GET",
    token,
  });
}

export async function deleteSnap(snapId: string): Promise<void> {
  const token = await getAccessToken();
  await apiRequest<{ success: true }>(withSnapId(API_ENDPOINTS.snaps.delete, snapId), {
    method: "DELETE",
    token,
  });
}

export async function likeSnap(snapId: string): Promise<SnapLikeResult> {
  const token = await getAccessToken();
  return apiRequest<SnapLikeResult>(withSnapId(API_ENDPOINTS.snaps.like, snapId), {
    method: "POST",
    token,
  });
}

export async function unlikeSnap(snapId: string): Promise<SnapLikeResult> {
  const token = await getAccessToken();
  return apiRequest<SnapLikeResult>(withSnapId(API_ENDPOINTS.snaps.like, snapId), {
    method: "DELETE",
    token,
  });
}

export async function getSnapComments(snapId: string): Promise<SnapCommentItem[]> {
  const token = await getAccessToken();
  return apiRequest<SnapCommentItem[]>(withSnapId(API_ENDPOINTS.snaps.comments, snapId), {
    method: "GET",
    token,
  });
}

export async function addSnapComment(
  snapId: string,
  text: string,
  parentCommentId?: string,
): Promise<SnapCommentItem> {
  const token = await getAccessToken();
  return apiRequest<SnapCommentItem>(withSnapId(API_ENDPOINTS.snaps.comments, snapId), {
    method: "POST",
    body: {
      text,
      ...(parentCommentId ? { parentCommentId } : {}),
    },
    token,
  });
}

export async function deleteSnapComment(snapId: string, commentId: string): Promise<void> {
  const token = await getAccessToken();
  await apiRequest<{ success: true }>(
    withCommentId(withSnapId(API_ENDPOINTS.snaps.comment, snapId), commentId),
    {
      method: "DELETE",
      token,
    },
  );
}

export async function likeSnapComment(snapId: string, commentId: string): Promise<SnapCommentLikeResult> {
  const token = await getAccessToken();
  return apiRequest<SnapCommentLikeResult>(
    withCommentId(withSnapId(API_ENDPOINTS.snaps.commentLike, snapId), commentId),
    {
      method: "POST",
      token,
    },
  );
}

export async function unlikeSnapComment(snapId: string, commentId: string): Promise<SnapCommentLikeResult> {
  const token = await getAccessToken();
  return apiRequest<SnapCommentLikeResult>(
    withCommentId(withSnapId(API_ENDPOINTS.snaps.commentLike, snapId), commentId),
    {
      method: "DELETE",
      token,
    },
  );
}
