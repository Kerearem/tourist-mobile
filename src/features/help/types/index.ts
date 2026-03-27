export type HelpRequestStatus = "open" | "in_progress" | "resolved";

export type HelpRequestAuthor = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export type HelpRequestViewerState = {
  hasResponded: boolean;
};

export type HelpRequest = {
  id: string;
  author: HelpRequestAuthor;
  community: string;
  countryCode: string;
  city: string;
  createdAt: string;
  title: string;
  description: string;
  category?: string;
  status: HelpRequestStatus;
  responsesCount: number;
  viewerState: HelpRequestViewerState;
};

export type GetHelpRequestsInput = {
  viewerId: string;
  community?: string;
  countryCode?: string;
  city?: string;
};

export type CreateHelpRequestInput = {
  author: HelpRequestAuthor;
  community: string;
  countryCode: string;
  city: string;
  title: string;
  description: string;
  category?: string;
};

export type RespondToHelpRequestInput = {
  requestId: string;
  viewerId: string;
};
