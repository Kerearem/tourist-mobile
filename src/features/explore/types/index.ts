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
  avatarUrl?: string;
};

export type ExplorePostStats = {
  likeCount: number;
  commentCount: number;
};

export type ExplorePostViewerState = {
  liked: boolean;
  saved?: boolean;
};

export type ExplorePost = {
  id: string;
  author: ExplorePostAuthor;
  community: string;
  countryCode: string;
  city: string;
  // Feed-context scope for the returned payload (city/country view), not intrinsic post visibility.
  scope: ExploreFeedScope;
  createdAt: string;
  text: string;
  media: ExplorePostMedia[];
  stats: ExplorePostStats;
  viewerState: ExplorePostViewerState;
};

export type LoadExploreFeedInput = {
  scope: ExploreFeedScope;
  community: string;
  countryCode: string;
  city: string;
};
