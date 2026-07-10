export type PublicUserProfileSeed = {
  id: string;
  username: string;
  displayName: string;
  countryCode: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
  accountType?: "personal" | "business";
  isFollowing?: boolean;
  hasNewPosts?: boolean;
  isOrganizer?: boolean;
  verificationBadge?: "organizer" | "business";
};
