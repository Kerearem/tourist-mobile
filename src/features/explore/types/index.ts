export type ExploreFeedScope = "city" | "country";

export type ExploreMediaType = "image" | "video";

export type ExplorePostMedia = {
  id: string;
  type: ExploreMediaType;
  url: string;
  thumbnailUrl?: string;
};

export type ExplorePostAuthor = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  accountType?: "personal" | "business";
  isOrganizer?: boolean;
  verificationBadge?: "organizer" | "business";
};

export type ExplorePostStats = {
  likeCount: number;
  commentCount: number;
};

export type ExplorePostViewerState = {
  liked: boolean;
  saved?: boolean;
};

export type ExploreFeedItemType = "snap";

export type ExploreFeedSnapItem = {
  type: ExploreFeedItemType;
  id: string;
  frontMediaUrl: string;
  backMediaUrl: string;
  caption?: string;
  locationText?: string;
  createdAt: string;
  author: ExplorePostAuthor & { username: string; isOrganizer: boolean };
  stats: ExplorePostStats;
  viewerState: {
    liked: boolean;
  };
};

export type ExploreFeedItem = ExploreFeedSnapItem;

export type ExplorePost = {
  id: string;
  type: ExploreFeedItemType;
  author: ExplorePostAuthor;
  locationText?: string;
  scope: ExploreFeedScope;
  createdAt: string;
  text: string;
  frontMediaUrl: string;
  backMediaUrl: string;
  media: ExplorePostMedia[];
  stats: ExplorePostStats;
  viewerState: ExplorePostViewerState;
};

export type LoadExploreFeedInput = {
  locationScope: ExploreFeedScope;
  identityScope: "nationality" | "everyone";
};

export type SnapCommentItem = {
  id: string;
  snapId: string;
  text: string;
  createdAt: string;
  parentCommentId?: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    accountType?: "personal" | "business";
    isOrganizer?: boolean;
    verificationBadge?: "organizer" | "business";
  };
  stats: {
    likeCount: number;
  };
  viewerState: {
    liked: boolean;
  };
  replies: SnapCommentItem[];
};

export type SnapLikeResult = {
  liked: boolean;
  likeCount: number;
};

export type SnapCommentLikeResult = SnapLikeResult;
