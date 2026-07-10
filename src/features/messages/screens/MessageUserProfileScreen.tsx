import React, { useCallback, useMemo } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, type NavigationProp } from "@react-navigation/native";

import { EventsRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { MainTabParamList, MessagesStackParamList } from "../../../navigation/types";
import { PublicUserProfileView } from "../../profile/components/PublicUserProfileView";
import { buildPublicUserProfileSeed } from "../../profile/utils/loadPublicUserProfile";
import { getOrCreateDirectConversation } from "../services/messages.service";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageUserProfileScreen">;

export function MessageUserProfileScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();

  const seed = useMemo(
    () =>
      buildPublicUserProfileSeed({
        id: route.params.userId,
        displayName: route.params.displayName,
        username: route.params.username,
        avatarUrl: route.params.avatarUrl,
        isOrganizer: route.params.isOrganizer,
      }),
    [route.params],
  );

  const openDirectMessage = useCallback(
    async (targetUserId: string, displayName: string, avatarUrl?: string) => {
      if (!user?.id) {
        return;
      }

      if (route.params.sourceThreadId) {
        navigation.navigate(MessagesRoutes.MessageThreadScreen, {
          threadId: route.params.sourceThreadId,
        });
        return;
      }

      try {
        const conversation = await getOrCreateDirectConversation({
          viewer: {
            id: user.id,
            displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
          },
          target: {
            id: targetUserId,
            displayName,
            avatarUrl,
          },
        });
        navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: conversation.id });
      } catch (error) {
        Alert.alert(
          "Mesaj gönderilemiyor",
          error instanceof Error ? error.message : "Bu kullanıcıyla mesajlaşamazsın.",
        );
      }
    },
    [navigation, route.params.sourceThreadId, user],
  );

  const openEventScreen = useCallback(
    (eventId: string, screen: typeof EventsRoutes.EventDetailScreen | typeof EventsRoutes.EventAlbumScreen) => {
      tabNavigation.navigate(TabRoutes.EventsTab, {
        screen,
        params: { eventId },
      });
    },
    [tabNavigation],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <PublicUserProfileView
        onActiveEventPress={(eventId) => openEventScreen(eventId, EventsRoutes.EventDetailScreen)}
        onBack={() => navigation.goBack()}
        onMemberEventPress={(eventId) => openEventScreen(eventId, EventsRoutes.EventAlbumScreen)}
        onOpenMessage={(profile) => {
          void openDirectMessage(profile.id, profile.displayName, profile.avatarUrl);
        }}
        onPastEventPress={(eventId) => openEventScreen(eventId, EventsRoutes.EventAlbumScreen)}
        seed={seed}
        userId={route.params.userId}
        viewerId={user?.id}
        viewerOrganizerStatus={user?.organizerStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
});
