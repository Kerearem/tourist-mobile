import type { ExplorePost, LoadExploreFeedInput } from "../types";

const MOCK_EXPLORE_POSTS: ExplorePost[] = [
  {
    id: "post_1",
    author: {
      id: "user_101",
      displayName: "Mert K.",
    },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    scope: "city",
    createdAt: "2026-03-27T09:30:00.000Z",
    text: "Anyone around Kreuzberg this weekend? Looking to meet people from the community.",
    media: [],
    stats: {
      likeCount: 12,
      commentCount: 4,
    },
    viewerState: {
      liked: false,
      saved: false,
    },
  },
  {
    id: "post_2",
    author: {
      id: "user_202",
      displayName: "Selin A.",
    },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    scope: "city",
    createdAt: "2026-03-27T10:15:00.000Z",
    text: "Shared apartment tip: this area has new listings this week.",
    media: [
      {
        id: "media_1",
        type: "image",
        url: "https://example.com/image-1.jpg",
      },
    ],
    stats: {
      likeCount: 24,
      commentCount: 7,
    },
    viewerState: {
      liked: true,
      saved: false,
    },
  },
  {
    id: "post_3",
    author: {
      id: "user_303",
      displayName: "Can D.",
    },
    community: "Turkish",
    countryCode: "DE",
    city: "Hamburg",
    scope: "country",
    createdAt: "2026-03-27T11:10:00.000Z",
    text: "Traveling from Hamburg to Berlin next week, any meetup suggestions?",
    media: [
      {
        id: "media_2",
        type: "video",
        url: "https://example.com/video-1.mp4",
        thumbnailUrl: "https://example.com/video-thumb-1.jpg",
      },
    ],
    stats: {
      likeCount: 8,
      commentCount: 2,
    },
    viewerState: {
      liked: false,
      saved: true,
    },
  },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const matchesCommunity = (postCommunity: string, requestedCommunity: string) => {
  if (!requestedCommunity.trim()) {
    return true;
  }
  return postCommunity.toLowerCase() === requestedCommunity.trim().toLowerCase();
};

export async function loadExploreFeed({
  scope,
  community,
  countryCode,
  city,
}: LoadExploreFeedInput): Promise<ExplorePost[]> {
  await delay(300);

  // Minimal deterministic error path for Phase 3.
  if (city.trim().toLowerCase() === "error-city") {
    throw new Error("Failed to load explore feed.");
  }

  const normalizedCountry = countryCode.trim().toUpperCase();
  const normalizedCity = city.trim().toLowerCase();

  if (scope === "city") {
    return MOCK_EXPLORE_POSTS.filter(
      (post) =>
        post.countryCode.toUpperCase() === normalizedCountry &&
        post.city.toLowerCase() === normalizedCity &&
        matchesCommunity(post.community, community),
    ).map((post) => ({
      ...post,
      scope: "city",
    }));
  }

  return MOCK_EXPLORE_POSTS.filter(
    (post) => post.countryCode.toUpperCase() === normalizedCountry && matchesCommunity(post.community, community),
  ).map((post) => ({
    ...post,
    scope: "country",
  }));
}
