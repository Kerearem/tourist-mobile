import type { EventAlbumMoment } from "../../events/types";
import type { ReelItem } from "../../profile/types/reels";
import type { SnapItem } from "../../snaps/types";
import type { ExplorePost } from "../../explore/types";
import type { ContentSharePayload } from "../types/contentShare";

export function buildExplorePostSharePayload(post: ExplorePost): ContentSharePayload {
  const previewUrl =
    post.type === "reel" ? post.media[0]?.url : post.backMediaUrl ?? post.frontMediaUrl;

  return {
    type: post.type === "reel" ? "reel" : "snap",
    contentId: post.id,
    authorDisplayName: post.author.displayName,
    ...(post.text?.trim() ? { caption: post.text.trim() } : {}),
    ...(previewUrl ? { previewUrl } : {}),
  };
}

export function buildReelSharePayload(reel: ReelItem, authorDisplayName: string): ContentSharePayload {
  const preview = reel.media.slice().sort((a, b) => a.order - b.order)[0];

  return {
    type: "reel",
    contentId: reel.id,
    authorDisplayName,
    ...(reel.caption?.trim() ? { caption: reel.caption.trim() } : {}),
    ...(preview?.url ? { previewUrl: preview.url } : {}),
  };
}

export function buildSnapSharePayload(
  snap: SnapItem,
  author: { displayName: string },
): ContentSharePayload {
  return {
    type: "snap",
    contentId: snap.id,
    authorDisplayName: snap.author?.displayName ?? author.displayName,
    ...(snap.caption?.trim() ? { caption: snap.caption.trim() } : {}),
    previewUrl: snap.backMediaUrl,
  };
}

export function buildMomentSharePayload(moment: EventAlbumMoment): ContentSharePayload {
  const firstMedia = moment.media[0];

  return {
    type: "moment",
    contentId: moment.id,
    authorDisplayName: moment.author.displayName,
    ...(moment.caption?.trim() ? { caption: moment.caption.trim() } : {}),
    ...(firstMedia?.url ? { previewUrl: firstMedia.url } : {}),
  };
}
