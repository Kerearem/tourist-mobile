import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationProp } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { ExploreRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { MainTabParamList, ProfileStackParamList } from "../../../navigation/types";
import {
  FOLLOW_LIST_EMPTY,
  FOLLOW_LIST_TITLES,
  getFollowList,
  type FollowListItem,
  type FollowListType,
} from "../services/follow.service";

type Props = NativeStackScreenProps<ProfileStackParamList, "FollowConnectionsScreen">;

export function FollowConnectionsScreen({ navigation, route }: Props) {
  const listType = route.params.listType;
  const [items, setItems] = useState<FollowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFollowList(listType);
      setItems(result);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [listType]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  const openUserProfile = (item: FollowListItem) => {
    const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
    tabNavigation?.navigate(TabRoutes.ExploreTab, {
      screen: ExploreRoutes.ExploreFeedScreen,
      params: {
        openUser: {
          id: item.user.id,
          username: item.user.username,
          displayName: item.user.displayName,
          avatarUrl: item.user.avatarUrl,
        },
      },
    });
  };

  const emptyCopy = FOLLOW_LIST_EMPTY[listType];

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title={FOLLOW_LIST_TITLES[listType]} />
      <View style={styles.container}>
        {isLoading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator color={theme.colors.textPrimary} />
            <AppText style={styles.loadingText} variant="bodyMuted">
              Yükleniyor...
            </AppText>
          </Card>
        ) : items.length === 0 ? (
          <Card style={styles.stateCard}>
            <EmptyState description={emptyCopy.description} title={emptyCopy.title} />
          </Card>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => openUserProfile(item)} style={styles.listItem}>
                <Avatar
                  initials={item.user.displayName.slice(0, 2).toUpperCase()}
                  size={44}
                  uri={item.user.avatarUrl}
                />
                <View style={styles.listItemText}>
                  <AppText style={styles.listItemName} variant="label">
                    {item.user.displayName}
                  </AppText>
                  <AppText style={styles.listItemUsername} variant="caption">
                    @{item.user.username}
                  </AppText>
                </View>
                <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateCard: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  loadingText: {
    marginTop: theme.spacing.xs,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  listItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  listItemText: {
    flex: 1,
    gap: 2,
  },
  listItemName: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  listItemUsername: {
    color: theme.colors.textSecondary,
  },
});
