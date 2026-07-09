import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  canOpenConversationInfo,
  canOpenMessageUserProfile,
  buildMessageUserProfileParams,
  resolveConversationInfoNavigation,
  resolveMessageUserProfileNavigation,
} from "../src/features/messages/utils/conversationInfoNavigation";
import {
  beginConversationSearchRequest,
  CONVERSATION_MEDIA_ERROR_MESSAGE,
  CONVERSATION_SEARCH_DEBOUNCE_MS,
  CONVERSATION_SEARCH_MIN_LENGTH,
  createInvalidatedConversationSearchState,
  normalizeConversationSearchQuery,
  resolveConversationInfoMediaFailure,
  shouldApplyConversationSearchResponse,
  shouldExecuteConversationSearch,
  shouldInvalidateConversationSearch,
} from "../src/features/messages/utils/conversationInfoSearch";
import {
  CONVERSATION_INFO_QUICK_ACTION_LABELS,
  CONVERSATION_INFO_SETTINGS_ROWS,
} from "../src/features/messages/utils/conversationInfoLayout";
import {
  hasSharedMediaPreview,
  resolveSharedMediaPreviewItems,
} from "../src/features/messages/utils/sharedMediaPreview";
import type { ConversationMessage } from "../src/features/messages/types";

describe("conversation info navigation", () => {
  it("resolves conversation info route with thread id", () => {
    const target = resolveConversationInfoNavigation("thread_123");
    assert.equal(target.screen, "ConversationInfoScreen");
    assert.deepEqual(target.params, { threadId: "thread_123" });
  });

  it("allows opening conversation info for supported threads", () => {
    assert.equal(canOpenConversationInfo(), true);
  });

  it("resolves message user profile route with participant params", () => {
    const params = buildMessageUserProfileParams(
      {
        id: "user_1",
        displayName: "Ada Lovelace",
        username: "ada",
        avatarUrl: "https://example.com/ada.jpg",
        accountType: "personal",
        isOrganizer: true,
      },
      "thread_123",
    );

    const target = resolveMessageUserProfileNavigation(params);
    assert.equal(target.screen, "MessageUserProfileScreen");
    assert.deepEqual(target.params, {
      userId: "user_1",
      displayName: "Ada Lovelace",
      username: "ada",
      avatarUrl: "https://example.com/ada.jpg",
      isOrganizer: true,
      sourceThreadId: "thread_123",
    });
  });

  it("disables profile navigation for system inbox or missing participant", () => {
    assert.equal(canOpenMessageUserProfile(undefined, false), false);
    assert.equal(canOpenMessageUserProfile(null, false), false);
    assert.equal(
      canOpenMessageUserProfile(
        {
          id: "user_1",
          displayName: "Tourist",
          username: "tourist",
          accountType: "personal",
          isOrganizer: false,
        },
        true,
      ),
      false,
    );
    assert.equal(
      canOpenMessageUserProfile(
        {
          id: "user_1",
          displayName: "Ada",
          username: "ada",
          accountType: "personal",
          isOrganizer: false,
        },
        false,
      ),
      true,
    );
  });

  it("navigates to MessageUserProfileScreen from ConversationInfoScreen source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/ConversationInfoScreen.tsx"),
      "utf8",
    );

    assert.match(source, /MessagesRoutes\.MessageUserProfileScreen/);
    assert.match(source, /buildMessageUserProfileParams/);
    assert.doesNotMatch(source, /TabRoutes\.ExploreTab/);
    assert.doesNotMatch(source, /ExploreRoutes/);
  });

  it("registers MessageUserProfileScreen in messages stack", () => {
    const routesSource = readFileSync(join(process.cwd(), "src/constants/routes.ts"), "utf8");
    const stackSource = readFileSync(
      join(process.cwd(), "src/navigation/messages/MessagesStack.tsx"),
      "utf8",
    );
    const typesSource = readFileSync(join(process.cwd(), "src/navigation/types.ts"), "utf8");

    assert.match(routesSource, /MessageUserProfileScreen/);
    assert.match(stackSource, /MessageUserProfileScreen/);
    assert.match(typesSource, /MessageUserProfileScreen: MessageUserProfileScreenParams/);
  });
});

describe("conversation info search helpers", () => {
  it("requires at least two characters before searching", () => {
    assert.equal(shouldExecuteConversationSearch("a"), false);
    assert.equal(shouldExecuteConversationSearch("ab"), true);
    assert.equal(CONVERSATION_SEARCH_MIN_LENGTH, 2);
    assert.equal(CONVERSATION_SEARCH_DEBOUNCE_MS, 300);
  });

  it("normalizes search query whitespace", () => {
    assert.equal(normalizeConversationSearchQuery("  hello  "), "hello");
  });

  it("invalidates search when query is too short or panel is closed", () => {
    assert.equal(shouldInvalidateConversationSearch("a", true), true);
    assert.equal(shouldInvalidateConversationSearch("ab", true), false);
    assert.equal(shouldInvalidateConversationSearch("ab", false), true);
  });

  it("clears search state when invalidated", () => {
    const state = createInvalidatedConversationSearchState();
    assert.deepEqual(state, { searchResults: [], searchError: null, isSearching: false });
  });

  it("ignores stale search responses", () => {
    const activeRequestId = 2;
    assert.equal(shouldApplyConversationSearchResponse(activeRequestId, 1), false);
    assert.equal(shouldApplyConversationSearchResponse(activeRequestId, 2), true);
  });

  it("does not let stale search response overwrite newer query results", () => {
    let results = [{ id: "new-result" }];
    const staleResponse = [{ id: "stale-result" }];
    const activeRequestId = 2;
    const staleRequestId = 1;

    if (shouldApplyConversationSearchResponse(activeRequestId, staleRequestId)) {
      results = staleResponse;
    }

    assert.equal(results[0]?.id, "new-result");
  });

  it("advances request ids for each new search attempt", () => {
    assert.equal(beginConversationSearchRequest(0), 1);
    assert.equal(beginConversationSearchRequest(1), 2);
  });
});

describe("shared media preview helpers", () => {
  const mediaMessage = (id: string): ConversationMessage => ({
    id,
    conversationId: "thread-1",
    sender: { id: "user-1", displayName: "Ada" },
    type: "image",
    text: "",
    mediaUrl: `https://example.com/${id}.jpg`,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  const textMessage: ConversationMessage = {
    id: "text-1",
    conversationId: "thread-1",
    sender: { id: "user-1", displayName: "Ada" },
    type: "text",
    text: "hello",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("returns only media messages up to preview limit", () => {
    const items = [
      textMessage,
      mediaMessage("m1"),
      mediaMessage("m2"),
      mediaMessage("m3"),
      mediaMessage("m4"),
      mediaMessage("m5"),
      mediaMessage("m6"),
      mediaMessage("m7"),
    ];

    const preview = resolveSharedMediaPreviewItems(items, 6);
    assert.equal(preview.length, 6);
    assert.equal(hasSharedMediaPreview(preview), true);
  });

  it("reports empty preview when no media exists", () => {
    assert.equal(hasSharedMediaPreview([textMessage]), false);
    assert.deepEqual(resolveSharedMediaPreviewItems([textMessage]), []);
  });
});

describe("conversation info layout labels", () => {
  it("exposes quick action labels for profile search mute and options", () => {
    assert.deepEqual(CONVERSATION_INFO_QUICK_ACTION_LABELS, [
      "Profil",
      "Ara",
      "Sessize al",
      "Seçenekler",
    ]);
  });

  it("exposes settings row labels for light theme placeholder rows", () => {
    const titles = CONVERSATION_INFO_SETTINGS_ROWS.map((row) => row.title);
    assert.deepEqual(titles, [
      "Tema",
      "Takma adlar",
      "Süreli mesajlar",
      "Gizlilik ve emniyet",
      "Grup sohbeti oluştur",
      "Bir şey çalışmıyor",
    ]);
    assert.equal(
      CONVERSATION_INFO_SETTINGS_ROWS.find((row) => row.title === "Tema")?.subtitle,
      "Varsayılan",
    );
    assert.equal(
      CONVERSATION_INFO_SETTINGS_ROWS.find((row) => row.title === "Süreli mesajlar")?.subtitle,
      "Kapalı",
    );
  });

  it("uses instagram-style layout labels in ConversationInfoScreen source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/ConversationInfoScreen.tsx"),
      "utf8",
    );

    assert.match(source, /quickActionsRow/);
    assert.match(source, /settingsSection/);
    assert.match(source, /mediaGrid/);
    assert.match(source, /CONVERSATION_INFO_SETTINGS_ROWS/);
    assert.doesNotMatch(source, /Profili Görüntüle/);
  });
});

describe("conversation info media error handling", () => {
  it("keeps media failure local and does not promote it to global detail error", () => {
    const failure = resolveConversationInfoMediaFailure();
    assert.equal(failure.mediaError, CONVERSATION_MEDIA_ERROR_MESSAGE);
    assert.equal(failure.globalError, null);
  });

  it("uses local media error state in ConversationInfoScreen source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/ConversationInfoScreen.tsx"),
      "utf8",
    );

    assert.match(source, /mediaError/);
    assert.match(source, /setMediaError\(CONVERSATION_MEDIA_ERROR_MESSAGE\)/);
    assert.doesNotMatch(source, /setError\("Ortak medya yüklenemedi\."\)/);
  });

  it("guards stale search responses in ConversationInfoScreen source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/messages/screens/ConversationInfoScreen.tsx"),
      "utf8",
    );

    assert.match(source, /searchRequestIdRef/);
    assert.match(source, /shouldApplyConversationSearchResponse/);
    assert.match(source, /shouldInvalidateConversationSearch/);
  });
});

describe("mock conversation info flow", () => {
  it("filters mock-style conversation search deterministically", () => {
    const messages = [
      { id: "message_mehmet_1", text: "Hey! Are you coming to the event tonight?" },
      { id: "message_mehmet_3", text: "We can meet near the venue." },
    ];
    const query = "venue";
    const matches = messages.filter((message) => message.text.toLowerCase().includes(query));

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.id, "message_mehmet_3");
  });
});
