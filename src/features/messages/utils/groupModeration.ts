import type { EventGroupMember } from "../../events/services/eventGroup.service";
import type { MuteDurationMinutes } from "../../events/services/eventGroup.service";

export const GROUP_MODERATION_REASON_MIN_LENGTH = 3;

export const MUTE_DURATION_OPTIONS: Array<{ minutes: MuteDurationMinutes; label: string }> = [
  { minutes: 15, label: "15 dakika" },
  { minutes: 60, label: "1 saat" },
  { minutes: 480, label: "8 saat" },
  { minutes: 1440, label: "24 saat" },
];

export const ORGANIZER_BAN_JOIN_MESSAGE_TR = "Bu organizatörün etkinliklerine katılamazsın";
export const GROUP_CLOSED_COMPOSER_MESSAGE_TR = "Bu grup kapatıldı";
export const GROUP_MUTED_COMPOSER_MESSAGE_TR = "Bu grupta geçici olarak susturuldun";

export type GroupMemberActionFlags = {
  canOpenSheet: boolean;
  showProfile: boolean;
  showReport: boolean;
  showKick: boolean;
  showBan: boolean;
  showMute: boolean;
  showUnmute: boolean;
};

export function isActiveMutedUntil(mutedUntil: string | null | undefined, now = Date.now()): boolean {
  if (!mutedUntil) {
    return false;
  }
  const expiresAt = Date.parse(mutedUntil);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function formatMuteRemainingLabel(
  mutedUntil: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!isActiveMutedUntil(mutedUntil, now) || !mutedUntil) {
    return null;
  }

  const remainingMs = Date.parse(mutedUntil) - now;
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes} dk kaldı`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} sa kaldı`;
  }
  return `${hours} sa ${minutes} dk kaldı`;
}

export function isValidModerationReason(reason: string): boolean {
  return reason.trim().length >= GROUP_MODERATION_REASON_MIN_LENGTH;
}

export function resolveGroupMemberActionFlags(input: {
  viewerId: string;
  viewerIsOrganizer: boolean;
  member: Pick<EventGroupMember, "id" | "role" | "mutedUntil">;
  isClosed?: boolean;
  isArchived?: boolean;
  now?: number;
}): GroupMemberActionFlags {
  const isSelf = input.member.id === input.viewerId;
  if (isSelf || !input.viewerId) {
    return {
      canOpenSheet: false,
      showProfile: false,
      showReport: false,
      showKick: false,
      showBan: false,
      showMute: false,
      showUnmute: false,
    };
  }

  const moderationOpen =
    input.viewerIsOrganizer &&
    input.member.role !== "ORGANIZER" &&
    !input.isClosed &&
    !input.isArchived;
  const muted = isActiveMutedUntil(input.member.mutedUntil, input.now);

  return {
    canOpenSheet: true,
    showProfile: true,
    showReport: true,
    showKick: moderationOpen,
    showBan: moderationOpen,
    showMute: moderationOpen && !muted,
    showUnmute: moderationOpen && muted,
  };
}

export function canCloseEventGroup(input: {
  viewerIsOrganizer: boolean;
  isClosed?: boolean;
  eventStatus?: string | null;
}): boolean {
  return (
    input.viewerIsOrganizer &&
    !input.isClosed &&
    input.eventStatus === "COMPLETED"
  );
}

export type GroupComposerGate =
  | { kind: "open" }
  | { kind: "archived" }
  | { kind: "closed" }
  | { kind: "muted"; mutedUntil: string; remainingLabel: string };

export function resolveGroupComposerGate(input: {
  isArchived?: boolean;
  isClosed?: boolean;
  viewerMutedUntil?: string | null;
  now?: number;
}): GroupComposerGate {
  if (input.isClosed) {
    return { kind: "closed" };
  }
  if (isActiveMutedUntil(input.viewerMutedUntil, input.now) && input.viewerMutedUntil) {
    return {
      kind: "muted",
      mutedUntil: input.viewerMutedUntil,
      remainingLabel: formatMuteRemainingLabel(input.viewerMutedUntil, input.now) ?? "",
    };
  }
  if (input.isArchived) {
    return { kind: "archived" };
  }
  return { kind: "open" };
}
