import type { ExplorePost, LoadExploreFeedInput } from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import { buildExploreFeedQueryParams } from "./audienceMode";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

export async function loadExploreFeed({
  scope,
  community,
  countryCode,
  city,
}: LoadExploreFeedInput): Promise<ExplorePost[]> {
  if (USE_MOCK_BACKEND) {
    const isGlobalMode = !community;
    const primaryCommunity = isGlobalMode ? "Spanish" : community;
    const secondaryCommunity = isGlobalMode ? "German" : community;
    return [
      {
        id: `explore_demo_${scope}_1`,
        author: {
          id: "creator_elif_berlin",
          displayName: "elif.berlin",
        },
        community: primaryCommunity || "Turkish",
        countryCode: countryCode || "DE",
        city: city || "Berlin",
        scope,
        createdAt: new Date().toISOString(),
        text:
          scope === "city"
            ? isGlobalMode
              ? "Hidden gem from local creators in your city feed. ☕"
              : "Hidden gem in Kreuzberg! ☕"
            : isGlobalMode
              ? "Top picks from different communities across your current country."
              : "Weekend ideas from the Turkish community across Germany.",
        media: [
          {
            id: "media_city_1",
            type: "image",
            url: "https://images.unsplash.com/photo-1526483360412-f4dbaf036963?auto=format&fit=crop&w=1400&q=80",
          },
          {
            id: "media_city_2",
            type: "image",
            url: "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1400&q=80",
          },
          {
            id: "media_city_3",
            type: "image",
            url: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1400&q=80",
          },
        ],
        stats: {
          likeCount: 12000,
          commentCount: 450,
        },
        viewerState: {
          liked: false,
        },
      },
      {
        id: `explore_demo_${scope}_2`,
        author: {
          id: "creator_ahmet",
          displayName: "ahmetyilmaz",
        },
        community: secondaryCommunity || "Turkish",
        countryCode: countryCode || "DE",
        city: city || "Berlin",
        scope,
        createdAt: new Date().toISOString(),
        text: isGlobalMode
          ? "Global mode: discover nearby posts from all communities in your location."
          : "Newcomer tip: the best conversations start at local community meetups.",
        media: [
          {
            id: "media_country_1",
            type: "image",
            url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
          },
          {
            id: "media_country_2",
            type: "image",
            url: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1400&q=80",
          },
        ],
        stats: {
          likeCount: 8200,
          commentCount: 210,
        },
        viewerState: {
          liked: true,
        },
      },
    ];
  }

  const token = await getAccessToken();
  const params = buildExploreFeedQueryParams({
    scope,
    community,
    countryCode,
    city,
  });

  const posts = await apiRequest<ExplorePost[]>(`${API_ENDPOINTS.explore.feed}?${params.toString()}`, {
    method: "GET",
    token,
  });

  // Keep feed-context scope explicit in service output contract.
  return posts.map((post) => ({
    ...post,
    scope,
  }));
}
