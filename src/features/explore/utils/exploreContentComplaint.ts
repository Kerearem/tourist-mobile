import type { ComplaintContentTargetType } from "../../profile/services/complaints.service";
import type { ExploreFeedItemType } from "../types";
import { getExplorePostPlaybackKey } from "./exploreReelPlayback";

export function resolveExplorePostComplaintTargetType(
  postType: ExploreFeedItemType,
): ComplaintContentTargetType {
  if (postType === "snap") {
    return "SNAP";
  }

  if (postType === "reel") {
    return "REEL";
  }

  throw new Error(`Unsupported explore post type for complaint: ${postType}`);
}

export function shouldShowExplorePostMoreAction(
  viewerId: string | undefined,
  authorId: string,
  isReportedHidden = false,
): boolean {
  if (isReportedHidden) {
    return false;
  }

  return Boolean(viewerId && viewerId !== authorId);
}

export function isExplorePostReportedHidden(
  reportedPostKeys: ReadonlySet<string>,
  post: { type: string; id: string },
): boolean {
  return reportedPostKeys.has(getExplorePostPlaybackKey(post));
}

export function markExplorePostReported(
  reportedPostKeys: ReadonlySet<string>,
  post: { type: string; id: string },
): Set<string> {
  const next = new Set(reportedPostKeys);
  next.add(getExplorePostPlaybackKey(post));
  return next;
}

export function shouldShowExplorePostInteractions(isReportedHidden: boolean): boolean {
  return !isReportedHidden;
}
