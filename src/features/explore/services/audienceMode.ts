import type { ExploreFeedScope, LoadExploreFeedInput } from "../types";

export type AudienceMode = "community" | "global";

export type ExploreFeedContext = {
  community: string;
  countryCode: string;
  city: string;
};

export type ExploreViewState = {
  scope: ExploreFeedScope;
  audienceMode: AudienceMode;
};

export type ExploreViewAction =
  | { type: "set_scope"; scope: ExploreFeedScope }
  | { type: "set_audience_mode"; audienceMode: AudienceMode };

export function reduceExploreViewState(state: ExploreViewState, action: ExploreViewAction): ExploreViewState {
  if (action.type === "set_scope") {
    return {
      ...state,
      scope: action.scope,
    };
  }
  return {
    ...state,
    audienceMode: action.audienceMode,
  };
}

export function hasRequiredContext(context: ExploreFeedContext, audienceMode: AudienceMode): boolean {
  if (!context.countryCode || !context.city) {
    return false;
  }
  if (audienceMode === "community" && !context.community) {
    return false;
  }
  return true;
}

export function buildLoadExploreFeedInput(params: {
  scope: ExploreFeedScope;
  audienceMode: AudienceMode;
  context: ExploreFeedContext;
}): LoadExploreFeedInput {
  return {
    scope: params.scope,
    countryCode: params.context.countryCode,
    city: params.context.city,
    community: params.audienceMode === "community" ? params.context.community : undefined,
  };
}

export function buildExploreFeedQueryParams(input: LoadExploreFeedInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("scope", input.scope);
  params.set("countryCode", input.countryCode);
  params.set("city", input.city);
  if (input.community) {
    params.set("community", input.community);
  }
  return params;
}
