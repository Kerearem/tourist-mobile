import type { UserPublicProfile } from "../services/userProfile.service";
import type { PublicUserProfileSeed } from "../types/publicUserProfile";

export function buildPublicUserProfileSeed(input: {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isOrganizer?: boolean;
  bio?: string;
  city?: string;
  countryCode?: string;
  accountType?: "personal" | "business";
  verificationBadge?: "organizer" | "business";
}): PublicUserProfileSeed {
  return {
    id: input.id,
    username: input.username?.trim() || "kullanici",
    displayName: input.displayName?.trim() || "Kullanıcı",
    countryCode: input.countryCode?.trim() || "",
    city: input.city,
    bio: input.bio,
    avatarUrl: input.avatarUrl,
    accountType: input.accountType,
    isOrganizer: input.isOrganizer ?? false,
    verificationBadge: input.verificationBadge,
  };
}

export function mergePublicUserProfileSeed(
  seed: PublicUserProfileSeed,
  publicProfile: UserPublicProfile,
): PublicUserProfileSeed {
  return {
    ...seed,
    username: publicProfile.username || seed.username,
    displayName: publicProfile.displayName || seed.displayName,
    avatarUrl: publicProfile.avatarUrl ?? seed.avatarUrl,
    bio: publicProfile.bio ?? seed.bio,
    city: publicProfile.city ?? seed.city,
    countryCode: publicProfile.countryCode ?? seed.countryCode,
    accountType: publicProfile.accountType,
    isOrganizer: publicProfile.isOrganizer,
    verificationBadge: publicProfile.verificationBadge,
  };
}
