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
  photoUrl?: string;
  responsesCount: number;
  viewerState: HelpRequestViewerState;
};

export type HelpLocationScope = "city" | "country";
export type HelpIdentityScope = "nationality" | "everyone";

export type GetHelpRequestsInput = {
  viewerId: string;
  locationScope?: HelpLocationScope;
  identityScope?: HelpIdentityScope;
  category?: string;
  search?: string;
};

export type CreateHelpRequestInput = {
  community: string;
  countryCode: string;
  city: string;
  title: string;
  description: string;
  category: string;
  photoUrl?: string;
};

export type RespondToHelpRequestInput = {
  requestId: string;
  viewerId: string;
};

export type RespondToHelpRequestResult = {
  helpRequest: HelpRequest;
  conversationId: string;
};

export type UpdateHelpRequestStatusInput = {
  requestId: string;
  status: HelpRequestStatus;
};
