export type ShareContentType = "snap" | "reel" | "moment";

export type ContentSharePayload = {
  type: ShareContentType;
  contentId: string;
  authorDisplayName: string;
  caption?: string;
  previewUrl?: string;
};

export type ShareFriendTarget = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  threadId?: string;
};
