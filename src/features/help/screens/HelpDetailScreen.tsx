import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList, MainTabParamList } from "../../../navigation/types";
import { getOrCreateHelpConversation } from "../../messages/services/messages.service";
import { getHelpRequestById } from "../services/help.service";
import type { HelpRequest } from "../types";

type Props = NativeStackScreenProps<HelpStackParamList, "HelpDetailScreen">;

export function HelpDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      if (!user?.id) {
        setError("No active user.");
        setIsLoading(false);
        return;
      }

      try {
        const detail = await getHelpRequestById(route.params.helpId, user.id);
        setRequest(detail);
        setError(null);
      } catch {
        setRequest(null);
        setError("Failed to load request details.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDetail();
  }, [route.params.helpId, user?.id]);

  const onHelpPress = async () => {
    if (!user?.id || !request) {
      return;
    }

    const conversation = await getOrCreateHelpConversation({
      helpRequestId: request.id,
      helper: {
        id: user.id,
        displayName: user.displayName,
      },
      requester: {
        id: request.author.id,
        displayName: request.author.displayName,
        avatarUrl: request.author.avatarUrl,
      },
    });
    setMessage("Opening conversation...");
    const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
    tabNavigation?.navigate(TabRoutes.MessagesTab, {
      screen: MessagesRoutes.MessageThreadScreen,
      params: { threadId: conversation.id },
    });
  };

  if (isLoading) {
    return (
      <Screen>
        <Loader label="Loading request..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState subtitle={error} title="Could not load request" />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen>
        <EmptyState subtitle="This request may have been removed." title="Request not found" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <AppText style={styles.title}>{request.title}</AppText>
        <AppText muted style={styles.meta}>
          {request.author.displayName} - {request.community} - {request.city}, {request.countryCode}
        </AppText>
        <AppText style={styles.description}>{request.description}</AppText>
        <AppText muted>Responders: {request.responsesCount}</AppText>
        {message ? <AppText style={styles.message}>{message}</AppText> : null}

        <AppButton label={request.viewerState.hasResponded ? "Responded" : "I Can Help"} onPress={() => void onHelpPress()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
  },
  meta: {
    marginBottom: 8,
  },
  description: {
    lineHeight: 22,
  },
  message: {
    color: "#16A34A",
  },
});
