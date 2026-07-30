import type { AppStateStatus } from "react-native";

import { ApiRequestError } from "../../../services/api/apiRequestError";
import type {
  EventAttendanceQrToken,
  EventAttendanceStatus,
  EventCheckinResult,
} from "../types";
import { formatEventTimeLabel } from "./eventTimezone";

export const CHECKIN_SCAN_DEBOUNCE_MS = 2_500;
export const CHECKIN_OFFLINE_MESSAGE_TR = "Bağlantı yok, tekrar dene";

export type CheckinNetworkSnapshot = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export type QrTokenErrorPresentation =
  | { kind: "not_started"; title: string; subtitle: string }
  | { kind: "closed"; title: string; subtitle: string }
  | { kind: "error"; title: string; subtitle: string };

type CheckinWindowErrorPayload = {
  windowStartsAt?: unknown;
  windowEndsAt?: unknown;
};

export function canShowAttendeeQrEntry(
  isHost: boolean,
  attendanceStatus: EventAttendanceStatus | undefined,
): boolean {
  return !isHost && attendanceStatus === "approved";
}

export function canShowHostQrScanner(isHost: boolean, eventStatus: unknown): boolean {
  return isHost && eventStatus === "APPROVED";
}

export function isCheckinNetworkOffline(
  state: CheckinNetworkSnapshot | null | undefined,
): boolean {
  if (!state) {
    return false;
  }

  return state.isConnected === false || state.isInternetReachable === false;
}

export function resolveQrRefreshDelayMs(
  token: Pick<EventAttendanceQrToken, "refreshAfterSeconds" | "expiresAt">,
  nowMs = Date.now(),
): number {
  const configuredDelay = Math.max(0, token.refreshAfterSeconds * 1_000);
  const safeExpiryDelay = Math.max(0, new Date(token.expiresAt).getTime() - nowMs - 1_000);

  if (!Number.isFinite(safeExpiryDelay)) {
    return configuredDelay;
  }

  return Math.min(configuredDelay, safeExpiryDelay);
}

export function shouldRefreshQrOnAppStateTransition(
  previous: AppStateStatus,
  next: AppStateStatus,
): boolean {
  return previous !== "active" && next === "active";
}

export function resolveQrTokenError(
  error: unknown,
  timezone: string | undefined,
): QrTokenErrorPresentation {
  const message = error instanceof Error ? error.message.trim() : "";
  const payload =
    error instanceof ApiRequestError && error.details && typeof error.details === "object"
      ? (error.details as CheckinWindowErrorPayload)
      : null;

  if (message === "Giriş saati henüz başlamadı") {
    const windowStartsAt =
      typeof payload?.windowStartsAt === "string" ? payload.windowStartsAt : null;
    const timeLabel = windowStartsAt
      ? formatEventTimeLabel(windowStartsAt, timezone)
      : null;

    return {
      kind: "not_started",
      title: timeLabel ? `Giriş ${timeLabel}'te açılır` : message,
      subtitle: "QR kodun giriş saati başladığında burada görünecek.",
    };
  }

  if (message === "Giriş kapandı") {
    return {
      kind: "closed",
      title: "Giriş kapandı",
      subtitle: "Bu etkinlik için QR ile giriş süresi sona erdi.",
    };
  }

  return {
    kind: "error",
    title: "QR kod yüklenemedi",
    subtitle: message || "Lütfen tekrar dene.",
  };
}

export function resolveQrWindowRetryDelayMs(
  error: unknown,
  nowMs = Date.now(),
): number | null {
  if (!(error instanceof ApiRequestError) || error.message !== "Giriş saati henüz başlamadı") {
    return null;
  }

  const payload =
    error.details && typeof error.details === "object"
      ? (error.details as CheckinWindowErrorPayload)
      : null;
  const windowStartsAt =
    typeof payload?.windowStartsAt === "string"
      ? new Date(payload.windowStartsAt).getTime()
      : Number.NaN;

  if (!Number.isFinite(windowStartsAt) || windowStartsAt <= nowMs) {
    return null;
  }

  return windowStartsAt - nowMs + 250;
}

export function resolveCheckinResultPresentation(result: EventCheckinResult): {
  tone: "success" | "duplicate";
  title: string;
} {
  return result.alreadyCheckedIn
    ? { tone: "duplicate", title: "Zaten giriş yapmış" }
    : { tone: "success", title: `${result.attendeeName} — giriş yapıldı` };
}

export function resolveCheckinScanError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message === CHECKIN_OFFLINE_MESSAGE_TR ||
      error.name === "AbortError" ||
      error instanceof TypeError
    ) {
      return CHECKIN_OFFLINE_MESSAGE_TR;
    }

    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return "QR kod doğrulanamadı. Tekrar dene.";
}

export type LastProcessedQr = {
  token: string;
  processedAtMs: number;
};

export function shouldProcessQrScan(
  lastProcessed: LastProcessedQr | null,
  candidateToken: string,
  nowMs: number,
  debounceMs = CHECKIN_SCAN_DEBOUNCE_MS,
): boolean {
  const token = candidateToken.trim();
  if (!token) {
    return false;
  }

  return !(
    lastProcessed?.token === token &&
    nowMs - lastProcessed.processedAtMs < debounceMs
  );
}
