import { useCallback, useEffect, useRef } from "react";
import { Keyboard, type FlatList } from "react-native";

import type { ConversationMessage } from "../types";
import {
  consumePendingScrollReason,
  resolveOwnMessageSentScrollPlan,
  shouldRunInitialScroll,
  shouldScrollMessageThread,
  shouldScrollOnKeyboardDidShow,
  type MessageThreadAutoScrollReason,
} from "../utils/messageThreadAutoScroll";

export function useMessageThreadListScroll(messages: ConversationMessage[]) {
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const pendingScrollReasonRef = useRef<MessageThreadAutoScrollReason | null>(null);
  const hasScrolledInitialRef = useRef(false);
  const keyboardOpenScrollConsumedRef = useRef(false);
  const messagesLengthRef = useRef(messages.length);

  messagesLengthRef.current = messages.length;

  const scrollToBottom = useCallback((animated = true) => {
    if (messagesLengthRef.current === 0) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated });
      });
    });
  }, []);

  const fulfillPendingScroll = useCallback(
    (animated = false) => {
      const { shouldScroll, nextPendingReason } = consumePendingScrollReason(
        pendingScrollReasonRef.current,
        messagesLengthRef.current,
      );

      if (!shouldScroll) {
        return;
      }

      pendingScrollReasonRef.current = nextPendingReason;
      scrollToBottom(animated);
    },
    [scrollToBottom],
  );

  const queueAutoScroll = useCallback(
    (reason: MessageThreadAutoScrollReason, animated = true) => {
      if (!shouldScrollMessageThread(reason, messages.length)) {
        return;
      }

      pendingScrollReasonRef.current = reason;
      scrollToBottom(animated);
    },
    [messages.length, scrollToBottom],
  );

  const handleContentSizeChange = useCallback(() => {
    fulfillPendingScroll(false);
  }, [fulfillPendingScroll]);

  const onInitialMessagesReady = useCallback(
    (isLoading: boolean) => {
      if (!shouldRunInitialScroll(hasScrolledInitialRef.current, messages.length, isLoading)) {
        return;
      }

      hasScrolledInitialRef.current = true;
      queueAutoScroll("initial_load", false);
    },
    [messages.length, queueAutoScroll],
  );

  const onOwnMessageSent = useCallback(() => {
    const plan = resolveOwnMessageSentScrollPlan(messages.length);
    pendingScrollReasonRef.current = plan.pendingReason;

    if (plan.shouldScrollImmediately) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  const resetForThread = useCallback(() => {
    hasScrolledInitialRef.current = false;
    pendingScrollReasonRef.current = null;
    keyboardOpenScrollConsumedRef.current = false;
  }, []);

  useEffect(() => {
    const onKeyboardDidShow = () => {
      if (
        !shouldScrollOnKeyboardDidShow(
          messagesLengthRef.current,
          keyboardOpenScrollConsumedRef.current,
        )
      ) {
        return;
      }

      keyboardOpenScrollConsumedRef.current = true;
      pendingScrollReasonRef.current = "keyboard_opened";
      fulfillPendingScroll(true);
    };

    const onKeyboardDidHide = () => {
      keyboardOpenScrollConsumedRef.current = false;
    };

    const showSub = Keyboard.addListener("keyboardDidShow", onKeyboardDidShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onKeyboardDidHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [fulfillPendingScroll]);

  return {
    listRef,
    handleContentSizeChange,
    onInitialMessagesReady,
    onOwnMessageSent,
    resetForThread,
  };
}
