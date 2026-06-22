import type {
  ConversationMessage,
  ConversationMessagesPage,
  ConversationThread,
  HelpConversationInput,
  SendMessageInput,
} from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const withThreadId = (template: string, threadId: string) => template.replace(":threadId", threadId);

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
}: SendMessageInput): Promise<ConversationMessage | null> {
  void sender;
  const cleanText = text.trim();
  if (!cleanText) {
    return null;
  }

  if (USE_MOCK_BACKEND || isMockHelpThread(threadId)) {
    const next: ConversationMessage = {
      id: `message_${Date.now()}`,
      conversationId: threadId,
      sender,
      type: "text",
      text: cleanText,
      createdAt: new Date().toISOString(),
      status: "sent",
      ...(isAnnouncement ? { isAnnouncement: true } : {}),
    };
    mockMessages[threadId] = [...(mockMessages[threadId] ?? []), next];
    const thread = mockThreads.find((item) => item.id === threadId);
    if (thread) {
      thread.lastMessagePreview = cleanText;
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
      text: cleanText,
      ...(isAnnouncement ? { isAnnouncement: true } : {}),
    },
  });
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
