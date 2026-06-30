export type ReelMediaType = "photo" | "video";
export type ReelsPublishBlockReason = "not_organizer" | "banned";

export type ReelsPublishResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: ReelsPublishBlockReason;
    };

export const canPublishOrganizerReel = (params: {
  organizerStatus?: string | null;
  isBanned?: boolean;
}): ReelsPublishResult => {
  if (params.isBanned) {
    return { allowed: false, reason: "banned" };
  }

  if (params.organizerStatus !== "approved") {
    return { allowed: false, reason: "not_organizer" };
  }

  return { allowed: true };
};

export const getReelsPublishBlockMessage = (reason: ReelsPublishBlockReason) => {
  switch (reason) {
    case "not_organizer":
      return "Tanıtım içeriği paylaşmak için onaylı organizatör olmalısın.";
    case "banned":
      return "Hesabın tanıtım içeriği paylaşmaya uygun değil.";
    default:
      return "Tanıtım içeriği paylaşımı şu anda kullanılamıyor.";
  }
};
