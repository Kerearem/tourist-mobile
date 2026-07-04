import type { ExploreFeedItem, ExploreFeedScope, ExplorePost, LoadExploreFeedInput } from "../types";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import { buildExploreFeedQueryParams } from "./audienceMode";

const getAccessToken = async () => {
  const hydrated = await hydrateAuthState();
  if (!hydrated) {
    throw new Error("Oturum süresi doldu. Lütfen çıkış yapıp tekrar giriş yap.");
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

const mapFeedItemToPost = (item: ExploreFeedItem, scope: ExploreFeedScope): ExplorePost => {
  if (item.type === "reel") {
    return {
      id: item.id,
      type: "reel",
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        username: item.author.username,
        avatarUrl: item.author.avatarUrl,
        accountType: item.author.accountType,
        isOrganizer: item.author.isOrganizer,
        verificationBadge: item.author.verificationBadge,
      },
      scope,
      createdAt: item.createdAt,
      text: item.caption ?? "",
      media: item.media.map((mediaItem) => ({
        id: mediaItem.id,
        type: mediaItem.type === "VIDEO" ? "video" : "image",
        url: mediaItem.url,
      })),
      ...(item.event ? { event: item.event } : {}),
      stats: {
        likeCount: item.stats.likeCount,
        commentCount: item.stats.commentCount,
      },
      viewerState: {
        liked: item.viewerState.liked,
      },
    };
  }

  return {
    id: item.id,
    type: "snap",
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      username: item.author.username,
      avatarUrl: item.author.avatarUrl,
      accountType: item.author.accountType,
      isOrganizer: item.author.isOrganizer,
      verificationBadge: item.author.verificationBadge,
    },
    locationText: item.locationText,
    scope,
    createdAt: item.createdAt,
    text: item.caption ?? "",
    frontMediaUrl: item.frontMediaUrl,
    backMediaUrl: item.backMediaUrl,
    media: [
      {
        id: `${item.id}_back`,
        type: "image",
        url: item.backMediaUrl,
      },
      {
        id: `${item.id}_front`,
        type: "image",
        url: item.frontMediaUrl,
      },
    ],
    stats: {
      likeCount: item.stats.likeCount,
      commentCount: item.stats.commentCount,
    },
    viewerState: {
      liked: item.viewerState.liked,
    },
  };
};

export async function loadExploreFeed(
  input: LoadExploreFeedInput,
  uiScope: ExploreFeedScope,
): Promise<ExplorePost[]> {
  const token = await getAccessToken();
  const params = buildExploreFeedQueryParams(input);

  const items = await apiRequest<ExploreFeedItem[]>(`${API_ENDPOINTS.explore.feed}?${params.toString()}`, {
    method: "GET",
    token,
  });

  return items.map((item) => mapFeedItemToPost(item, uiScope));
}
