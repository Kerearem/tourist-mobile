export type ExploreLocationScope = "city" | "country";
export type ExploreIdentityScope = "nationality" | "everyone";

/** UI alias kept for existing filter controls */
export type ExploreFeedScope = ExploreLocationScope;
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

export type LoadExploreFeedInput = {
  locationScope: ExploreLocationScope;
  identityScope: ExploreIdentityScope;
};

export function toLocationScope(scope: ExploreFeedScope): ExploreLocationScope {
  return scope;
}

export function toIdentityScope(audienceMode: AudienceMode): ExploreIdentityScope {
  return audienceMode === "community" ? "nationality" : "everyone";
}

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
}): LoadExploreFeedInput {
  return {
    locationScope: toLocationScope(params.scope),
    identityScope: toIdentityScope(params.audienceMode),
  };
}

export function buildExploreFeedQueryParams(input: LoadExploreFeedInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("locationScope", input.locationScope);
  params.set("identityScope", input.identityScope);
  return params;
}
