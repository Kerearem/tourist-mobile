import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { getBlockedUsers, unblockUser, type BlockedUserItem } from "../services/block.service";

type Props = {
  navigation: { goBack: () => void };
};

export function BlockedUsersScreen({ navigation }: Props) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBlockedUsers();
      setBlockedUsers(result);
    } catch {
      setBlockedUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBlockedUsers();
    }, [loadBlockedUsers]),
  );

  const onUnblock = async (item: BlockedUserItem) => {
    if (unblockingId) {
      return;
    }

    setUnblockingId(item.user.id);
    try {
      await unblockUser(item.user.id);
      setBlockedUsers((previous) => previous.filter((row) => row.user.id !== item.user.id));
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Engel kaldırılamadı.");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Engellenenler" />
      <View style={styles.container}>
        {isLoading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator color={theme.colors.textPrimary} />
            <AppText style={styles.loadingText} variant="bodyMuted">
              Yükleniyor...
            </AppText>
          </Card>
        ) : blockedUsers.length === 0 ? (
          <Card style={styles.stateCard}>
            <EmptyState
              description="Profil menüsünden veya keşfet ekranından kullanıcı engelleyebilirsin."
              title="Henüz kimseyi engellemedin"
            />
          </Card>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
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
                <Pressable
                  disabled={unblockingId === item.user.id}
                  onPress={() => void onUnblock(item)}
                  style={styles.unblockButton}
                >
                  <AppText style={styles.unblockButtonText} variant="caption">
                    {unblockingId === item.user.id ? "..." : "Engeli Kaldır"}
                  </AppText>
                </Pressable>
              </View>
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
  unblockButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  unblockButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
});
