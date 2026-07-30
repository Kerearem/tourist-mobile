import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import type { EventAttendanceQrToken, EventCheckinResult } from "../types";
import {
  CHECKIN_OFFLINE_MESSAGE_TR,
  isCheckinNetworkOffline,
  type CheckinNetworkSnapshot,
} from "../utils/eventCheckinUi";

type NetInfoModule = {
  fetch: () => Promise<CheckinNetworkSnapshot>;
};

type NetInfoImporter = () => Promise<{ default: NetInfoModule } | NetInfoModule>;

const withEventId = (template: string, eventId: string) =>
  template.replace(":eventId", eventId);

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

/**
 * Lazy NetInfo load (no top-level import). Older native binaries without
 * RNCNetInfo must not crash the screen; when unavailable we skip the
 * preflight and let the fetch path surface the offline message.
 */
async function loadCheckinNetInfoSafely(
  importer: NetInfoImporter,
): Promise<NetInfoModule | null> {
  try {
    const loaded = await importer();
    const module =
      loaded && typeof loaded === "object" && "default" in loaded && loaded.default
        ? loaded.default
        : (loaded as NetInfoModule);

    if (typeof module?.fetch !== "function") {
      return null;
    }

    return module;
  } catch {
    return null;
  }
}

async function assertCheckinNetworkAvailable(): Promise<void> {
  const netInfo = await loadCheckinNetInfoSafely(
    () => import("@react-native-community/netinfo"),
  );
  if (!netInfo) {
    return;
  }

  const networkState = await netInfo.fetch();
  if (isCheckinNetworkOffline(networkState)) {
    throw new Error(CHECKIN_OFFLINE_MESSAGE_TR);
  }
}

export async function getEventAttendanceQrToken(
  eventId: string,
): Promise<EventAttendanceQrToken> {
  if (USE_MOCK_BACKEND) {
    const now = Date.now();
    return {
      token: `mock-checkin-${eventId}-${now}`,
      expiresInSeconds: 60,
      refreshAfterSeconds: 45,
      expiresAt: new Date(now + 60_000).toISOString(),
      windowStartsAt: new Date(now - 60_000).toISOString(),
      windowEndsAt: new Date(now + 3_600_000).toISOString(),
      alreadyCheckedIn: false,
    };
  }

  const token = await getAccessToken();
  return apiRequest<EventAttendanceQrToken>(
    withEventId(API_ENDPOINTS.events.attendanceQrToken, eventId),
    { method: "GET", token },
  );
}

export async function checkInEventAttendee(
  eventId: string,
  qrToken: string,
): Promise<EventCheckinResult> {
  await assertCheckinNetworkAvailable();

  if (USE_MOCK_BACKEND) {
    return {
      attendeeName: "Mock Katılımcı",
      avatarUrl: null,
      checkedInAt: new Date().toISOString(),
      alreadyCheckedIn: false,
    };
  }

  const token = await getAccessToken();
  return apiRequest<EventCheckinResult>(
    withEventId(API_ENDPOINTS.events.checkin, eventId),
    {
      method: "POST",
      token,
      body: { token: qrToken },
    },
  );
}
