import { useEffect, useRef } from "react";

import { USE_MOCK_BACKEND } from "../../../constants/env";
import { useAuth } from "../../../hooks/useAuth";
import { messagesRealtimeClient } from "../realtime/messagesRealtimeClient";
import type { ConversationUpdatedEvent, MessageNewEvent } from "../realtime/messageRealtimeEvents";

type UseMessagesRealtimeOptions = {
  enabled?: boolean;
  onMessageNew?: (event: MessageNewEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
  onReconnect?: () => void;
};

export function useMessagesRealtime({
  enabled = true,
  onMessageNew,
  onConversationUpdated,
  onReconnect,
}: UseMessagesRealtimeOptions) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const onMessageNewRef = useRef(onMessageNew);
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  const onReconnectRef = useRef(onReconnect);

  onMessageNewRef.current = onMessageNew;
  onConversationUpdatedRef.current = onConversationUpdated;
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
    const unsubscribeReconnect = messagesRealtimeClient.onReconnect(() => {
      onReconnectRef.current?.();
    });

    return () => {
      unsubscribeMessage();
      unsubscribeConversation();
      unsubscribeReconnect();
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (!userId) {
      messagesRealtimeClient.disconnect();
    }
  }, [userId]);
}
