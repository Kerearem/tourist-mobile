import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type NotificationType = "EVENT_CREATED" | "EVENT_JOINED";

export type AppNotificationItem = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  event: {
    id: string;
    title: string;
  };
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

const mockNotifications: AppNotificationItem[] = [];

export function getNotificationMessage(item: AppNotificationItem): string {
  if (item.type === "EVENT_CREATED") {
    return `${item.actor.displayName} yeni bir etkinlik oluşturdu: ${item.event.title}`;
  }
  return `${item.actor.displayName} bir etkinliğe katıldı: ${item.event.title}`;
}

export async function getNotifications(): Promise<AppNotificationItem[]> {
  if (USE_MOCK_BACKEND) {
    return [...mockNotifications];
  }

  const token = await getAccessToken();
  return apiRequest<AppNotificationItem[]>(API_ENDPOINTS.notifications.list, {
    method: "GET",
    token,
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (USE_MOCK_BACKEND) {
    return mockNotifications.filter((item) => !item.isRead).length;
  }

  const token = await getAccessToken();
  const result = await apiRequest<{ count: number }>(API_ENDPOINTS.notifications.unreadCount, {
    method: "GET",
    token,
  });
  return result.count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const item = mockNotifications.find((row) => row.id === notificationId);
    if (item) {
      item.isRead = true;
    }
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(
    API_ENDPOINTS.notifications.markRead.replace(":notificationId", notificationId),
    {
      method: "POST",
      token,
    },
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK_BACKEND) {
    mockNotifications.forEach((item) => {
      item.isRead = true;
    });
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.notifications.readAll, {
    method: "POST",
    token,
  });
}
