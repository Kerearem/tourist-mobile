import { useEffect, useRef } from "react";

import { USE_MOCK_BACKEND } from "../../../constants/env";
import { useAuth } from "../../../hooks/useAuth";
import { messagesRealtimeClient } from "../realtime/messagesRealtimeClient";
import type {
  ConversationUpdatedEvent,
  MessageNewEvent,
  MessageReceiptsEvent,
} from "../realtime/messageRealtimeEvents";

type UseMessagesRealtimeOptions = {
  enabled?: boolean;
  onMessageNew?: (event: MessageNewEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
  onMessageReceipts?: (event: MessageReceiptsEvent) => void;
  onReconnect?: () => void;
};

export function useMessagesRealtime({
  enabled = true,
  onMessageNew,
  onConversationUpdated,
  onMessageReceipts,
  onReconnect,
}: UseMessagesRealtimeOptions) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const onMessageNewRef = useRef(onMessageNew);
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const onMessageReceiptsRef = useRef(onMessageReceipts);
  const onReconnectRef = useRef(onReconnect);

  onMessageNewRef.current = onMessageNew;
  onConversationUpdatedRef.current = onConversationUpdated;
  onMessageReceiptsRef.current = onMessageReceipts;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled || !userId || USE_MOCK_BACKEND) {
      return undefined;
    }

    void messagesRealtimeClient.connectForCurrentSession(userId);

    const unsubscribeMessage = messagesRealtimeClient.onMessageNew((event) => {
      onMessageNewRef.current?.(event);
    });
    const unsubscribeConversation = messagesRealtimeClient.onConversationUpdated((event) => {
      onConversationUpdatedRef.current?.(event);
    });
    const unsubscribeReceipts = messagesRealtimeClient.onMessageReceipts((event) => {
      onMessageReceiptsRef.current?.(event);
    });
    const unsubscribeReconnect = messagesRealtimeClient.onReconnect(() => {
      onReconnectRef.current?.();
    });

    return () => {
      unsubscribeMessage();
      unsubscribeConversation();
      unsubscribeReceipts();
      unsubscribeReconnect();
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (!userId) {
      messagesRealtimeClient.disconnect();
    }
  }, [userId]);
}
