export type ReelMediaItem = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  order: number;
};

export type ReelEventSummary = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  city: string;
  status: string;
};

export type ReelItem = {
  id: string;
  caption: string | null;
  eventId: string | null;
  event: ReelEventSummary | null;
  createdAt: string;
  media: ReelMediaItem[];
  stats: {
    likeCount: number;
    commentCount: number;
  };
  viewerState: {
    liked: boolean;
  };
};

export type CreateReelInput = {
  caption?: string;
  eventId?: string;
  media: Array<{
    url: string;
    type: "IMAGE" | "VIDEO";
    order: number;
  }>;
};
