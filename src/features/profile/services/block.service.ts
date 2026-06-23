import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type BlockedUserItem = {
  id: string;
  blockedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
};

export type UserBlockStatus = {
  blockedByMe: boolean;
  blockedMe: boolean;
  isBlocked: boolean;
};

const getAccessToken = async () => {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state?.tokens.accessToken) {
      throw new Error("Oturum bulunamadı.");
    }
    return state.tokens.accessToken;
  }

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

const mockBlockedUsers: BlockedUserItem[] = [];

const withUserId = (template: string, userId: string) => template.replace(":userId", userId);

export async function blockUser(userId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      throw new Error("Oturum bulunamadı.");
    }
    if (!mockBlockedUsers.some((item) => item.user.id === userId)) {
      mockBlockedUsers.unshift({
        id: `block_${viewerId}_${userId}`,
        blockedAt: new Date().toISOString(),
        user: {
          id: userId,
          username: "blocked_user",
          displayName: "Engellenen Kullanıcı",
        },
      });
    }
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withUserId(API_ENDPOINTS.users.block, userId), {
    method: "POST",
    token,
  });
}

export async function unblockUser(userId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const index = mockBlockedUsers.findIndex((item) => item.user.id === userId);
    if (index >= 0) {
      mockBlockedUsers.splice(index, 1);
    }
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withUserId(API_ENDPOINTS.users.block, userId), {
    method: "DELETE",
    token,
  });
}

export async function getBlockedUsers(): Promise<BlockedUserItem[]> {
  if (USE_MOCK_BACKEND) {
    return [...mockBlockedUsers];
  }

  const token = await getAccessToken();
  return apiRequest<BlockedUserItem[]>(API_ENDPOINTS.users.blocked, {
    method: "GET",
    token,
  });
}

export async function getUserBlockStatus(userId: string): Promise<UserBlockStatus> {
  if (USE_MOCK_BACKEND) {
    const blocked = mockBlockedUsers.some((item) => item.user.id === userId);
    return {
      blockedByMe: blocked,
      blockedMe: false,
      isBlocked: blocked,
    };
  }

  const token = await getAccessToken();
  return apiRequest<UserBlockStatus>(withUserId(API_ENDPOINTS.users.blockStatus, userId), {
    method: "GET",
    token,
  });
}
