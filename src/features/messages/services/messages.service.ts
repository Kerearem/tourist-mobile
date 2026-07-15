import type {
  ConversationInfo,
  ConversationMediaResult,
  ConversationMessage,
  ConversationMessagesPage,
  ConversationSearchResult,
  ConversationThread,
  HelpConversationInput,
  SendMessageInput,
  AllowedMessageReaction,
  MessageReactionSummary,
} from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";
import {
  removeViewerReaction,
  replaceViewerReaction,
} from "../utils/messageReactions";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const withThreadId = (template: string, threadId: string) => template.replace(":threadId", threadId);
const withMessageId = (template: string, messageId: string) =>
  template.replace(":messageId", messageId);

const mockHelpThreads = (): ConversationThread[] => {
  const now = new Date();
  return [
    {
      id: "thread_help_ayse",
      type: "help",
      title: "Help request follow-up",
      participants: [
        { id: "user_test_tourist", displayName: "Test Tourist" },
        { id: "user_ayse", displayName: "Ayse Yilmaz" },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastMessagePreview: "Thanks for the help yesterday! Really appreciate it.",
      lastMessageAt: now.toISOString(),
      unreadCount: 0,
      helpRequestId: "help_demo_sofa",
    },
  ];
};

const mockHelpMessages: Record<string, ConversationMessage[]> = {
  thread_help_ayse: [
    {
      id: "message_ayse_1",
      conversationId: "thread_help_ayse",
      sender: { id: "user_ayse", displayName: "Ayse Yilmaz" },
      type: "text",
      text: "Thanks for the help yesterday! Really appreciate it.",
      createdAt: new Date().toISOString(),
      status: "read",
    },
  ],
};

const now = new Date();
const mockThreads: ConversationThread[] = [
  {
    id: "thread_mehmet_event",
    type: "direct",
    participants: [
      { id: "user_test_tourist", displayName: "Test Tourist" },
      { id: "user_mehmet", displayName: "Mehmet Kaya" },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastMessagePreview: "Hey! Are you coming to the event tonight?",
    lastMessageAt: now.toISOString(),
    unreadCount: 2,
  },
  ...mockHelpThreads(),
  {
    id: "thread_support",
    type: "direct",
    title: "Tourist Support",
    participants: [
      { id: "user_test_tourist", displayName: "Test Tourist" },
      { id: "tourist_support", displayName: "Tourist Support" },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastMessagePreview: "Welcome to Tourist! Let us know if you need anything.",
    lastMessageAt: now.toISOString(),
    unreadCount: 0,
  },
];

const mockMessages: Record<string, ConversationMessage[]> = {
  thread_mehmet_event: [
    {
      id: "message_mehmet_1",
      conversationId: "thread_mehmet_event",
      sender: { id: "user_mehmet", displayName: "Mehmet Kaya" },
      type: "text",
      text: "Hey! Are you coming to the event tonight?",
      createdAt: now.toISOString(),
      status: "delivered",
    },
    {
      id: "message_mehmet_2",
      conversationId: "thread_mehmet_event",
      sender: { id: "user_test_tourist", displayName: "Test Tourist" },
      type: "image",
      text: "",
      mediaUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=400&q=80",
      mediaType: "image",
      createdAt: now.toISOString(),
      status: "sent",
    },
    {
      id: "message_mehmet_3",
      conversationId: "thread_mehmet_event",
      sender: { id: "user_mehmet", displayName: "Mehmet Kaya" },
      type: "text",
      text: "We can meet near the venue.",
      createdAt: now.toISOString(),
      status: "delivered",
    },
  ],
  ...mockHelpMessages,
  thread_support: [
    {
      id: "message_support_1",
      conversationId: "thread_support",
      sender: { id: "tourist_support", displayName: "Tourist Support" },
      type: "text",
      text: "Welcome to Tourist! Let us know if you need anything.",
      createdAt: now.toISOString(),
      status: "read",
    },
  ],
};

const isMockHelpThread = (threadId: string) => threadId.startsWith("thread_help_");

const MOCK_VIEWER_ID = "user_test_tourist";

const buildMockConversationInfo = (threadId: string): ConversationInfo | null => {
  const thread =
    mockThreads.find((item) => item.id === threadId) ??
    mockHelpThreads().find((item) => item.id === threadId) ??
    null;
  if (!thread) {
    return null;
  }

  const other = thread.participants.find((participant) => participant.id !== MOCK_VIEWER_ID);
  const messages = mockMessages[threadId] ?? [];
  const sharedMediaPreview = messages
    .filter((message) => Boolean(message.mediaUrl))
    .slice()
    .reverse()
    .slice(0, 6);

  const isSystemInbox = thread.metadata?.isSystemInbox === "true";

  return {
    conversation: thread,
    otherParticipant:
      thread.type === "direct" && other && !isSystemInbox
        ? {
            id: other.id,
            displayName: other.displayName,
            username: other.displayName.toLowerCase().replace(/\s+/g, "_"),
            avatarUrl: other.avatarUrl,
            accountType: "personal",
            isOrganizer: false,
          }
        : undefined,
    sharedMediaPreview,
  };
};

const searchMockConversationMessages = (
  threadId: string,
  query: string,
  page = 1,
  limit = 20,
): ConversationSearchResult => {
  const normalizedQuery = query.trim().toLowerCase();
  const messages = (mockMessages[threadId] ?? []).filter((message) =>
    message.text.toLowerCase().includes(normalizedQuery),
  );
  const start = (page - 1) * limit;

  return {
    messages: messages.slice(start, start + limit),
    query: query.trim(),
    page,
    limit,
    total: messages.length,
  };
};

const getMockConversationMedia = (threadId: string, page = 1, limit = 30): ConversationMediaResult => {
  const messages = (mockMessages[threadId] ?? []).filter((message) => Boolean(message.mediaUrl)).reverse();
  const start = (page - 1) * limit;

  return {
    messages: messages.slice(start, start + limit),
    page,
    limit,
    total: messages.length,
  };
};

export async function getConversations(): Promise<ConversationThread[]> {
  if (USE_MOCK_BACKEND) {
    return mockThreads;
  }

  const token = await getAccessToken();
  const directThreads = await apiRequest<ConversationThread[]>(API_ENDPOINTS.messages.conversations, {
    method: "GET",
    token,
  });

  return [...directThreads, ...mockHelpThreads()];
}

export async function getMessageRequests(): Promise<ConversationThread[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<ConversationThread[]>(API_ENDPOINTS.messages.requests, {
    method: "GET",
    token,
  });
}

export async function acceptConversation(threadId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withThreadId(API_ENDPOINTS.messages.acceptConversation, threadId), {
    method: "POST",
    token,
  });
}

export async function getConversationById(threadId: string): Promise<ConversationThread | null> {
  if (USE_MOCK_BACKEND) {
    return mockThreads.find((thread) => thread.id === threadId) ?? null;
  }

  if (isMockHelpThread(threadId)) {
    return mockHelpThreads().find((thread) => thread.id === threadId) ?? null;
  }

  const token = await getAccessToken();
  return apiRequest<ConversationThread | null>(withThreadId(API_ENDPOINTS.messages.conversationDetail, threadId), {
    method: "GET",
    token,
  });
}

export async function getMessages(threadId: string): Promise<ConversationMessagesPage> {
  if (USE_MOCK_BACKEND) {
    return { messages: mockMessages[threadId] ?? [], pinnedMessage: null };
  }

  if (isMockHelpThread(threadId)) {
    return { messages: mockHelpMessages[threadId] ?? [], pinnedMessage: null };
  }

  const token = await getAccessToken();
  return apiRequest<ConversationMessagesPage>(withThreadId(API_ENDPOINTS.messages.messages, threadId), {
    method: "GET",
    token,
  });
}

export async function markConversationRead(threadId: string): Promise<void> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withThreadId(API_ENDPOINTS.messages.markRead, threadId), {
    method: "POST",
    token,
  });
}

export async function sendMessage({
  threadId,
  sender,
  text,
  isAnnouncement,
  mediaUrl,
  mediaType,
  replyToMessageId,
}: SendMessageInput): Promise<ConversationMessage | null> {
  void sender;
  const cleanText = (text ?? "").trim();
  const cleanMediaUrl = mediaUrl?.trim() ?? "";
  if (!cleanText && !cleanMediaUrl) {
    return null;
  }

  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    const next: ConversationMessage = {
      id: `message_${Date.now()}`,
      conversationId: threadId,
      sender,
      type: cleanMediaUrl ? "image" : "text",
      text: cleanText,
      createdAt: new Date().toISOString(),
      status: "sent",
      ...(replyToMessageId
        ? {
            replyTo: (() => {
              const target = (mockMessages[threadId] ?? []).find((item) => item.id === replyToMessageId);
              return target
                ? {
                    id: target.id,
                    sender: { displayName: target.sender.displayName },
                    text: target.text || (target.mediaUrl ? "📷 Fotoğraf" : "Mesaj"),
                    type: target.type,
                  }
                : undefined;
            })(),
          }
        : {}),
      reactions: [],
      ...(isAnnouncement ? { isAnnouncement: true } : {}),
      ...(cleanMediaUrl ? { mediaUrl: cleanMediaUrl, mediaType: "image" as const } : {}),
    };
    mockMessages[threadId] = [...(mockMessages[threadId] ?? []), next];
    const thread = mockThreads.find((item) => item.id === threadId);
    if (thread) {
      thread.lastMessagePreview = cleanText || "📷 Fotoğraf";
      thread.lastMessageAt = next.createdAt;
      thread.updatedAt = next.createdAt;
    }
    return next;
  }

  const token = await getAccessToken();
  return apiRequest<ConversationMessage | null>(withThreadId(API_ENDPOINTS.messages.sendMessage, threadId), {
    method: "POST",
    token,
    body: {
      ...(cleanText ? { text: cleanText } : {}),
      ...(isAnnouncement ? { isAnnouncement: true } : {}),
      ...(replyToMessageId ? { replyToMessageId } : {}),
      ...(cleanMediaUrl
        ? {
            mediaUrl: cleanMediaUrl,
            mediaType: mediaType ?? "image",
          }
        : {}),
    },
  });
}

export async function setMessageReaction(
  threadId: string,
  messageId: string,
  emoji: AllowedMessageReaction,
): Promise<MessageReactionSummary[]> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    const message = (mockMessages[threadId] ?? []).find((item) => item.id === messageId);
    if (!message) {
      return [];
    }
    message.reactions = replaceViewerReaction(message.reactions ?? [], emoji);
    return message.reactions;
  }

  const token = await getAccessToken();
  const endpoint = withMessageId(
    withThreadId(API_ENDPOINTS.messages.messageReaction, threadId),
    messageId,
  );
  const response = await apiRequest<{ messageId: string; reactions: MessageReactionSummary[] }>(
    endpoint,
    { method: "POST", token, body: { emoji } },
  );
  return response.reactions;
}

export async function removeMessageReaction(
  threadId: string,
  messageId: string,
): Promise<MessageReactionSummary[]> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    const message = (mockMessages[threadId] ?? []).find((item) => item.id === messageId);
    if (!message) {
      return [];
    }
    message.reactions = removeViewerReaction(message.reactions ?? []);
    return message.reactions;
  }

  const token = await getAccessToken();
  const endpoint = withMessageId(
    withThreadId(API_ENDPOINTS.messages.messageReaction, threadId),
    messageId,
  );
  const response = await apiRequest<{ messageId: string; reactions: MessageReactionSummary[] }>(
    endpoint,
    { method: "DELETE", token },
  );
  return response.reactions;
}

export async function pinMessage(threadId: string, messageId: string): Promise<void> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withThreadId(API_ENDPOINTS.messages.pinMessage, threadId), {
    method: "POST",
    token,
    body: { messageId },
  });
}

export async function unpinMessage(threadId: string): Promise<void> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withThreadId(API_ENDPOINTS.messages.unpinMessage, threadId), {
    method: "DELETE",
    token,
  });
}

export async function getOrCreateDirectConversation({
  viewer,
  target,
}: {
  viewer: { id: string; displayName: string };
  target: { id: string; displayName: string; avatarUrl?: string };
}): Promise<ConversationThread> {
  if (USE_MOCK_BACKEND) {
    const existing = mockThreads.find((thread) => {
      if (thread.type !== "direct") {
        return false;
      }
      const participantIds = thread.participants.map((item) => item.id);
      return participantIds.includes(viewer.id) && participantIds.includes(target.id);
    });
    if (existing) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const nextThread: ConversationThread = {
      id: `thread_direct_${viewer.id}_${target.id}`,
      type: "direct",
      participants: [
        { id: viewer.id, displayName: viewer.displayName },
        { id: target.id, displayName: target.displayName, avatarUrl: target.avatarUrl },
      ],
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: "",
      lastMessageAt: createdAt,
      unreadCount: 0,
    };
    mockThreads.unshift(nextThread);
    mockMessages[nextThread.id] = [];
    return nextThread;
  }

  void viewer;
  void target.displayName;
  void target.avatarUrl;

  const token = await getAccessToken();
  return apiRequest<ConversationThread>(API_ENDPOINTS.messages.directConversation, {
    method: "POST",
    token,
    body: {
      targetUserId: target.id,
    },
  });
}

export async function getOrCreateHelpConversation({
  helpRequestId,
  helper,
  requester,
}: HelpConversationInput): Promise<ConversationThread> {
  if (USE_MOCK_BACKEND) {
    const existing = mockThreads.find((thread) => thread.helpRequestId === helpRequestId);
    if (existing) {
      return existing;
    }

    const createdAt = new Date().toISOString();
    const nextThread: ConversationThread = {
      id: `thread_help_${helpRequestId}`,
      type: "help",
      title: "Help request conversation",
      participants: [helper, requester],
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: "Help conversation started.",
      lastMessageAt: createdAt,
      unreadCount: 0,
      helpRequestId,
    };
    mockThreads.unshift(nextThread);
    mockMessages[nextThread.id] = [
      {
        id: `message_system_${helpRequestId}`,
        conversationId: nextThread.id,
        sender: { id: "system", displayName: "Tourist" },
        type: "system",
        text: "Help conversation started.",
        createdAt,
        systemKind: "help_conversation_started",
      },
    ];
    return nextThread;
  }

  void helper;
  void requester;
  const token = await getAccessToken();
  return apiRequest<ConversationThread>(API_ENDPOINTS.messages.helpConversation, {
    method: "POST",
    token,
    body: {
      helpRequestId,
    },
  });
}

export async function getConversationInfo(threadId: string): Promise<ConversationInfo> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    const info = buildMockConversationInfo(threadId);
    if (!info) {
      throw new Error("Conversation not found.");
    }
    return info;
  }

  const token = await getAccessToken();
  return apiRequest<ConversationInfo>(withThreadId(API_ENDPOINTS.messages.conversationInfo, threadId), {
    method: "GET",
    token,
  });
}

export async function searchConversationMessages(
  threadId: string,
  query: string,
  page = 1,
): Promise<ConversationSearchResult> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    return searchMockConversationMessages(threadId, query, page);
  }

  const token = await getAccessToken();
  return apiRequest<ConversationSearchResult>(
    `${withThreadId(API_ENDPOINTS.messages.conversationSearch, threadId)}?q=${encodeURIComponent(query)}&page=${page}`,
    {
      method: "GET",
      token,
    },
  );
}

export async function getConversationMedia(threadId: string, page = 1): Promise<ConversationMediaResult> {
  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    return getMockConversationMedia(threadId, page);
  }

  const token = await getAccessToken();
  return apiRequest<ConversationMediaResult>(
    `${withThreadId(API_ENDPOINTS.messages.conversationMedia, threadId)}?page=${page}`,
    {
      method: "GET",
      token,
    },
  );
}