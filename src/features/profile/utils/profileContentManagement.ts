export type ProfileContentType = "SNAP" | "REEL" | "MOMENT";

export type ProfileContentPinMeta = {
  isPinned?: boolean;
  pinnedAt?: string;
};

export type OwnContentManagementTarget = {
  id: string;
  type: ProfileContentType;
  caption: string | null;
  isPinned?: boolean;
  eventId?: string;
};

export const PROFILE_PIN_LIMIT_MESSAGE_TR = "En fazla 3 gönderi sabitleyebilirsin.";

export const PROFILE_CONTENT_CAPTION_LIMITS: Record<ProfileContentType, number> = {
  SNAP: 500,
  REEL: 2000,
  MOMENT: 2000,
};

export type OwnContentManagementCapabilities = {
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
};

export function getOwnContentManagementCapabilities(
  type: ProfileContentType,
  context: "profile" | "event-album",
): OwnContentManagementCapabilities {
  return {
    canEdit: true,
    canDelete: true,
    // v1: backend rejects MOMENT pins; keep menu row hidden everywhere.
    canPin: type !== "MOMENT",
  };
}

export function sortProfileContentItems<T extends { createdAt: string } & ProfileContentPinMeta>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    if (left.isPinned && right.isPinned) {
      return new Date(right.pinnedAt ?? 0).getTime() - new Date(left.pinnedAt ?? 0).getTime();
    }

    if (left.isPinned) {
      return -1;
    }

    if (right.isPinned) {
      return 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function applyProfileContentPinState<T extends ProfileContentPinMeta>(
  item: T,
  isPinned: boolean,
  pinnedAt?: string,
): T {
  if (!isPinned) {
    return {
      ...item,
      isPinned: false,
      pinnedAt: undefined,
    };
  }

  return {
    ...item,
    isPinned: true,
    ...(pinnedAt ? { pinnedAt } : {}),
  };
}
