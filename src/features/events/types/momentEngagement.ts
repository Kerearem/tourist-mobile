import type { EventAlbumMoment } from "../types";

export type MomentCommentItem = {
  id: string;
  momentId: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
};

export type MomentLikeResult = {
  liked: boolean;
  likeCount: number;
};

export type MomentFeedItem = EventAlbumMoment;
