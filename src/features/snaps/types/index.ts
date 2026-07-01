export type SnapItem = {
  id: string;
  userId: string;
  frontMediaUrl: string;
  backMediaUrl: string;
  caption?: string;
  locationText?: string;
  createdAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    accountType?: "personal" | "business";
    isOrganizer?: boolean;
    verificationBadge?: "organizer" | "business";
  };
};

export type CreateSnapInput = {
  frontMediaUrl: string;
  backMediaUrl: string;
  caption?: string;
  locationText?: string;
};
