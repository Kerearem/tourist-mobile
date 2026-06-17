import type { EventItem } from "../../events/types";

export type ReelMediaType = "photo" | "video";
export type ReelsPublishBlockReason = "missing_event" | "not_approved" | "too_early" | "too_late";

export type ReelsPublishResult =
  | {
      allowed: true;
      windowStartIso: string;
      windowEndIso: string;
    }
  | {
      allowed: false;
      reason: ReelsPublishBlockReason;
      windowStartIso?: string;
      windowEndIso?: string;
    };

const HOUR_IN_MS = 60 * 60 * 1000;

const parseIso = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getReelsWindow = (event: EventItem) => {
  const startsAt = parseIso(event.startsAt);
  if (!startsAt) {
    return null;
  }
  const endsAt = parseIso(event.endsAt) ?? new Date(startsAt.getTime() + HOUR_IN_MS);
  return {
    start: new Date(startsAt.getTime() - HOUR_IN_MS),
    end: new Date(endsAt.getTime() + HOUR_IN_MS),
  };
};

export const canPublishReelForEvent = (event: EventItem | null, now = new Date()): ReelsPublishResult => {
  if (!event) {
    return { allowed: false, reason: "missing_event" };
  }

  if (event.attendanceStatus !== "approved") {
    return { allowed: false, reason: "not_approved" };
  }

  const window = getReelsWindow(event);
  if (!window) {
    return { allowed: false, reason: "too_early" };
  }

  if (now.getTime() < window.start.getTime()) {
    return {
      allowed: false,
      reason: "too_early",
      windowStartIso: window.start.toISOString(),
      windowEndIso: window.end.toISOString(),
    };
  }

  if (now.getTime() > window.end.getTime()) {
    return {
      allowed: false,
      reason: "too_late",
      windowStartIso: window.start.toISOString(),
      windowEndIso: window.end.toISOString(),
    };
  }

  return {
    allowed: true,
    windowStartIso: window.start.toISOString(),
    windowEndIso: window.end.toISOString(),
  };
};

export const getReelsPublishBlockMessage = (reason: ReelsPublishBlockReason) => {
  switch (reason) {
    case "missing_event":
      return "Reels paylasmak icin bir etkinlik secmelisin.";
    case "not_approved":
      return "Etkinlige katiliminiz onayli degil.";
    case "too_early":
      return "Reels paylasimi bu etkinlik icin henuz acik degil.";
    case "too_late":
      return "Bu etkinlik icin reels paylasim suresi sona erdi.";
    default:
      return "Reels paylasimi su anda kullanilamiyor.";
  }
};
