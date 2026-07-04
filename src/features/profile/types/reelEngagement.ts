export type ReelCommentItem = {
  id: string;
  reelId: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
};

export type ReelLikeResult = {
  liked: boolean;
  likeCount: number;
};
