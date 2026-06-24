import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { EventsRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { MainTabParamList, MessagesStackParamList } from "../../../navigation/types";
import {
  getNotificationMessage,
  getNotifications,
  markNotificationRead,
  type AppNotificationItem,
} from "../../notifications/services/notifications.service";

type Props = NativeStackScreenProps<MessagesStackParamList, "NotificationsScreen">;

const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications();
      setItems(data);
      setError(null);
    } catch {
      setItems([]);
      setError("Bildirimler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = (item: AppNotificationItem) => {
    void (async () => {
      try {
        if (!item.isRead) {
          await markNotificationRead(item.id);
          setItems((previous) =>
            previous.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
          );
        }
      } catch {
        // Navigation should still work even if mark-read fails.
      }

      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.EventsTab, {
        screen: EventsRoutes.EventDetailScreen,
        params: { eventId: item.event.id },
      });
    })();
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Bildirimler" />
        <Card style={styles.stateCard}>
          <Loader label="Bildirimler yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Bildirimler" />
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadNotifications()} subtitle={error} title="Bildirimler yüklenemedi" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Bildirimler" />
      {items.length === 0 ? (
        <Card style={styles.stateCard}>
          <EmptyState
            description="Takip ettiğin kişilerin etkinlik haberleri burada görünecek."
            title="Henüz bildirim yok"
          />
        </Card>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openNotification(item)}
              style={[styles.itemRow, !item.isRead && styles.itemRowUnread]}
            >
              <Avatar
                initials={item.actor.displayName.slice(0, 2).toUpperCase()}
                size={44}
                uri={item.actor.avatarUrl}
              />
              <View style={styles.itemText}>
                <AppText style={[styles.itemMessage, !item.isRead && styles.itemMessageUnread]} variant="body">
                  {getNotificationMessage(item)}
                </AppText>
                <AppText muted variant="caption">
                  {formatNotificationDate(item.createdAt)}
                </AppText>
              </View>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
              <Ionicons color={theme.colors.muted} name="chevron-forward" size={18} />
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  itemRowUnread: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  itemMessage: {
    color: theme.colors.textPrimary,
  },
  itemMessageUnread: {
    fontWeight: "700",
  },
  unreadDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
