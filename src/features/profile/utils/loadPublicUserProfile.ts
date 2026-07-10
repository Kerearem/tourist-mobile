import { blockUser, getUserBlockStatus, unblockUser, type UserBlockStatus } from "../services/block.service";
import {
  followUser,
  getFollowStatus,
  unfollowUser,
  type FollowStatus,
} from "../services/follow.service";
import {
  getUserProfileStats,
  getUserPublicProfile,
  type UserProfileStats,
} from "../services/userProfile.service";
import type { PublicUserProfileSeed } from "../types/publicUserProfile";
import { mergePublicUserProfileSeed } from "./publicUserProfileHelpers";

export { buildPublicUserProfileSeed, mergePublicUserProfileSeed } from "./publicUserProfileHelpers";

export type PublicUserProfileDetails = {
  profile: PublicUserProfileSeed;
  blockStatus: UserBlockStatus;
  followStatus: FollowStatus;
  stats: UserProfileStats;
};

export async function loadPublicUserProfileDetails(
  seed: PublicUserProfileSeed,
): Promise<PublicUserProfileDetails> {
  const [blockStatus, followStatus, publicProfile, stats] = await Promise.all([
    getUserBlockStatus(seed.id),
    getFollowStatus(seed.id),
    getUserPublicProfile(seed.id),
    getUserProfileStats(seed.id),
  ]);

  return {
    profile: mergePublicUserProfileSeed(seed, publicProfile),
    blockStatus,
    followStatus,
    stats,
  };
}

export async function togglePublicUserFollow(
  userId: string,
  followStatus: FollowStatus | null,
): Promise<FollowStatus> {
  if (followStatus?.iFollow) {
    await unfollowUser(userId);
  } else {
    await followUser(userId);
  }
  return getFollowStatus(userId);
}

export async function togglePublicUserBlock(
  userId: string,
  blockStatus: UserBlockStatus | null,
): Promise<UserBlockStatus> {
  if (blockStatus?.blockedByMe) {
    await unblockUser(userId);
    return { blockedByMe: false, blockedMe: false, isBlocked: false };
  }

  await blockUser(userId);
  return { blockedByMe: true, blockedMe: false, isBlocked: true };
}
