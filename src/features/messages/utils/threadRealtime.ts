import type { ConversationMessage } from "../types";

export function appendMessageDeduped(
  messages: ConversationMessage[],
  incoming: ConversationMessage,
): ConversationMessage[] {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }

  return sortConversationMessages([...messages, incoming]);
}

export function sortConversationMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages].sort((left, right) => {
    const createdDiff = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (createdDiff !== 0) {
      return createdDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

export function isMessageForThread(message: ConversationMessage, threadId: string): boolean {
  return message.conversationId === threadId;
}
