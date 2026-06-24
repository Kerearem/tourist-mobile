import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type FollowUserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
};

export type FollowListItem = {
  id: string;
  followedAt: string;
  user: FollowUserSummary;
};

export type FollowStatus = {
  iFollow: boolean;
  followsMe: boolean;
  isFriend: boolean;
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

const withUserId = (template: string, userId: string) => template.replace(":userId", userId);

const mockFollowing = new Map<string, FollowListItem[]>();
const mockFollowers = new Map<string, FollowListItem[]>();

const ensureMockLists = (viewerId: string) => {
  if (!mockFollowing.has(viewerId)) {
    mockFollowing.set(viewerId, []);
  }
  if (!mockFollowers.has(viewerId)) {
    mockFollowers.set(viewerId, []);
  }
};

export function getFollowButtonLabel(status: FollowStatus): string {
  if (status.isFriend) {
    return "Arkadaşsınız";
  }
  if (status.iFollow) {
    return "Takip Ediliyor";
  }
  if (status.followsMe) {
    return "Geri Takip Et";
  }
  return "Takip Et";
}

export async function followUser(userId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      throw new Error("Oturum bulunamadı.");
    }
    ensureMockLists(viewerId);
    ensureMockLists(userId);
    const following = mockFollowing.get(viewerId)!;
    if (!following.some((item) => item.user.id === userId)) {
      following.unshift({
        id: `follow_${viewerId}_${userId}`,
        followedAt: new Date().toISOString(),
        user: {
          id: userId,
          username: "mock_user",
          displayName: "Mock User",
        },
      });
      mockFollowers.get(userId)!.unshift({
        id: `follow_${viewerId}_${userId}`,
        followedAt: new Date().toISOString(),
        user: {
          id: viewerId,
          username: state.user?.publicProfile.username ?? "me",
          displayName: state.user?.publicProfile.displayName ?? "Me",
        },
      });
    }
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withUserId(API_ENDPOINTS.users.follow, userId), {
    method: "POST",
    token,
  });
}

export async function unfollowUser(userId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      throw new Error("Oturum bulunamadı.");
    }
    ensureMockLists(viewerId);
    ensureMockLists(userId);
    mockFollowing.set(
      viewerId,
      mockFollowing.get(viewerId)!.filter((item) => item.user.id !== userId),
    );
    mockFollowers.set(
      userId,
      mockFollowers.get(userId)!.filter((item) => item.user.id !== viewerId),
    );
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withUserId(API_ENDPOINTS.users.follow, userId), {
    method: "DELETE",
    token,
  });
}

export async function getFollowStatus(userId: string): Promise<FollowStatus> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      return { iFollow: false, followsMe: false, isFriend: false };
    }
    ensureMockLists(viewerId);
    ensureMockLists(userId);
    const iFollow = mockFollowing.get(viewerId)!.some((item) => item.user.id === userId);
    const followsMe = mockFollowers.get(viewerId)!.some((item) => item.user.id === userId);
    return {
      iFollow,
      followsMe,
      isFriend: iFollow && followsMe,
    };
  }

  const token = await getAccessToken();
  return apiRequest<FollowStatus>(withUserId(API_ENDPOINTS.users.followStatus, userId), {
    method: "GET",
    token,
  });
}

export async function getMyFollowing(): Promise<FollowListItem[]> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      return [];
    }
    ensureMockLists(viewerId);
    return [...mockFollowing.get(viewerId)!];
  }

  const token = await getAccessToken();
  return apiRequest<FollowListItem[]>(API_ENDPOINTS.users.myFollowing, {
    method: "GET",
    token,
  });
}

export async function getMyFollowers(): Promise<FollowListItem[]> {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    const viewerId = state?.user?.id;
    if (!viewerId) {
      return [];
    }
    ensureMockLists(viewerId);
    return [...mockFollowers.get(viewerId)!];
  }

  const token = await getAccessToken();
  return apiRequest<FollowListItem[]>(API_ENDPOINTS.users.myFollowers, {
    method: "GET",
    token,
  });
}

export async function getMyFriends(): Promise<FollowListItem[]> {
  if (USE_MOCK_BACKEND) {
    const following = await getMyFollowing();
    const followers = await getMyFollowers();
    const followerIds = new Set(followers.map((item) => item.user.id));
    return following.filter((item) => followerIds.has(item.user.id));
  }

  const token = await getAccessToken();
  return apiRequest<FollowListItem[]>(API_ENDPOINTS.users.myFriends, {
    method: "GET",
    token,
  });
}

export type FollowListType = "following" | "followers" | "friends";

export async function getFollowList(listType: FollowListType): Promise<FollowListItem[]> {
  if (listType === "following") {
    return getMyFollowing();
  }
  if (listType === "followers") {
    return getMyFollowers();
  }
  return getMyFriends();
}

export const FOLLOW_LIST_TITLES: Record<FollowListType, string> = {
  following: "Takip Ettiklerim",
  followers: "Takipçilerim",
  friends: "Arkadaşlarım",
};

export const FOLLOW_LIST_EMPTY: Record<FollowListType, { title: string; description: string }> = {
  following: {
    title: "Henüz kimseyi takip etmiyorsun",
    description: "Keşfet ekranından kullanıcıları takip edebilirsin.",
  },
  followers: {
    title: "Henüz takipçin yok",
    description: "Profilini paylaştıkça takipçilerin burada görünecek.",
  },
  friends: {
    title: "Henüz arkadaşın yok",
    description: "Karşılıklı takip ettiğin kişiler arkadaş olarak listelenir.",
  },
};
