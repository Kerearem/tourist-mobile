import type { ConversationMessage, ConversationThread, HelpConversationInput, SendMessageInput } from "../types";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const conversationsStore: ConversationThread[] = [
  {
    id: "thread_1",
    type: "direct",
    participants: [
      { id: "user_1001", displayName: "Ayse K." },
      { id: "user_1002", displayName: "Can A." },
    ],
    createdAt: "2026-03-27T08:30:00.000Z",
    updatedAt: "2026-03-27T09:10:00.000Z",
    lastMessagePreview: "Let me check and send details.",
    lastMessageAt: "2026-03-27T09:10:00.000Z",
    unreadCount: 1,
  },
];

const messagesStore: Record<string, ConversationMessage[]> = {
  thread_1: [
    {
      id: "msg_1",
      conversationId: "thread_1",
      sender: { id: "user_1001", displayName: "Ayse K." },
      type: "text",
      text: "Hi, are you available to help with registration forms?",
      createdAt: "2026-03-27T09:00:00.000Z",
      status: "read",
    },
    {
      id: "msg_2",
      conversationId: "thread_1",
      sender: { id: "user_1002", displayName: "Can A." },
      type: "text",
      text: "Let me check and send details.",
      createdAt: "2026-03-27T09:10:00.000Z",
      status: "delivered",
    },
  ],
};

export async function getConversations(): Promise<ConversationThread[]> {
  await wait(220);
  return [...conversationsStore].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getConversationById(threadId: string): Promise<ConversationThread | null> {
  await wait(120);
  return conversationsStore.find((item) => item.id === threadId) ?? null;
}

export async function getMessages(threadId: string): Promise<ConversationMessage[]> {
  await wait(180);
  return [...(messagesStore[threadId] ?? [])].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

export async function sendMessage({ threadId, sender, text }: SendMessageInput): Promise<ConversationMessage | null> {
  await wait(120);

  const conversation = conversationsStore.find((item) => item.id === threadId);
  if (!conversation) {
    return null;
  }

  const cleanText = text.trim();
  if (!cleanText) {
    return null;
  }

  const nextMessage: ConversationMessage = {
    id: `msg_${Date.now()}`,
    conversationId: threadId,
    sender,
    type: "text",
    text: cleanText,
    createdAt: new Date().toISOString(),
    status: "sent",
  };

  const existing = messagesStore[threadId] ?? [];
  messagesStore[threadId] = [...existing, nextMessage];

  conversation.updatedAt = nextMessage.createdAt;
  conversation.lastMessageAt = nextMessage.createdAt;
  conversation.lastMessagePreview = nextMessage.text;

  return nextMessage;
}

export async function getOrCreateHelpConversation({
  helpRequestId,
  helper,
  requester,
}: HelpConversationInput): Promise<ConversationThread> {
  await wait(150);

  const existing = conversationsStore.find(
    (item) => item.type === "help" && item.helpRequestId === helpRequestId,
  );

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const threadId = `help_thread_${Date.now()}`;

  const nextConversation: ConversationThread = {
    id: threadId,
    type: "help",
    title: "Help Conversation",
    participants: [requester, helper],
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: "Help conversation started",
    lastMessageAt: now,
    unreadCount: 0,
    helpRequestId,
    metadata: {
      origin: "help_request",
    },
  };

  const systemMessage: ConversationMessage = {
    id: `sys_${Date.now()}`,
    conversationId: threadId,
    sender: {
      id: "system",
      displayName: "System",
    },
    type: "system",
    text: "Help conversation started",
    createdAt: now,
    systemKind: "help_conversation_started",
  };

  conversationsStore.unshift(nextConversation);
  messagesStore[threadId] = [systemMessage];

  return nextConversation;
}
