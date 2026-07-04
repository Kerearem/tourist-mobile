import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { loadShareFriendTargets, sendContentToFriend, shareContentSystem } from "../services/contentShare.service";
import type { ContentSharePayload, ShareFriendTarget } from "../types/contentShare";

type ContentShareSheetProps = {
  visible: boolean;
  payload: ContentSharePayload | null;
  onClose: () => void;
};

type ShareStep = "menu" | "friends";

export function ContentShareSheet({ visible, payload, onClose }: ContentShareSheetProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<ShareStep>("menu");
  const [friends, setFriends] = useState<ShareFriendTarget[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep("menu");
      setFriends([]);
      setFriendsError(null);
      setIsLoadingFriends(false);
      setIsSending(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (isSending) {
      return;
    }
    onClose();
  };

  const openFriendsStep = async () => {
    if (!user?.id) {
      Alert.alert("Giriş gerekli", "Arkadaşına göndermek için giriş yapmalısın.");
      return;
    }

    setStep("friends");
    setIsLoadingFriends(true);
    setFriendsError(null);

    try {
      const targets = await loadShareFriendTargets(user.id);
      setFriends(targets);
    } catch (error) {
      setFriends([]);
      setFriendsError(error instanceof Error ? error.message : "Arkadaş listesi yüklenemedi.");
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleSystemShare = async () => {
    if (!payload) {
      return;
    }

    handleClose();
    await shareContentSystem(payload);
  };

  const handleSendToFriend = async (target: ShareFriendTarget) => {
    if (!payload || !user?.id || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendContentToFriend({
        viewer: {
          id: user.id,
          displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
        },
        target,
        payload,
      });
      handleClose();
      Alert.alert("Gönderildi", `${target.displayName} ile paylaşıldı.`);
    } catch (error) {
      Alert.alert("Gönderilemedi", error instanceof Error ? error.message : "Mesaj gönderilemedi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable onPress={handleClose} style={styles.backdrop}>
        <Pressable onPress={() => undefined} style={styles.wrap}>
          <View style={styles.sheet}>
            {step === "menu" ? (
              <>
                <View style={styles.handle} />
                <AppText style={styles.title} variant="sectionTitle">
                  Paylaş
                </AppText>
                <Pressable disabled={isSending} onPress={() => void openFriendsStep()} style={styles.optionRow}>
                  <Ionicons color={theme.colors.textPrimary} name="paper-plane-outline" size={22} />
                  <AppText style={styles.optionText} variant="body">
                    Arkadaşına gönder
                  </AppText>
                </Pressable>
                <Pressable disabled={isSending} onPress={() => void handleSystemShare()} style={styles.optionRow}>
                  <Ionicons color={theme.colors.textPrimary} name="share-outline" size={22} />
                  <AppText style={styles.optionText} variant="body">
                    Paylaş
                  </AppText>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.friendsHeader}>
                  <Pressable disabled={isSending} onPress={() => setStep("menu")} style={styles.backButton}>
                    <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
                  </Pressable>
                  <AppText style={styles.title} variant="sectionTitle">
                    Arkadaşına gönder
                  </AppText>
                  <View style={styles.backButton} />
                </View>
                {isLoadingFriends ? (
                  <View style={styles.stateWrap}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                ) : friendsError ? (
                  <View style={styles.stateWrap}>
                    <AppText style={styles.stateText} variant="bodyMuted">
                      {friendsError}
                    </AppText>
                  </View>
                ) : friends.length === 0 ? (
                  <View style={styles.stateWrap}>
                    <AppText style={styles.stateText} variant="bodyMuted">
                      Henüz mesajlaştığın bir arkadaş yok.
                    </AppText>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const initials = item.displayName.slice(0, 2).toUpperCase();
                      return (
                        <Pressable
                          disabled={isSending}
                          onPress={() => void handleSendToFriend(item)}
                          style={styles.friendRow}
                        >
                          <Avatar initials={initials} size="md" uri={item.avatarUrl} />
                          <View style={styles.friendBody}>
                            <AppText style={styles.friendName} variant="label">
                              {item.displayName}
                            </AppText>
                            {item.username ? (
                              <AppText style={styles.friendUsername} variant="caption">
                                @{item.username}
                              </AppText>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    }}
                    style={styles.friendList}
                  />
                )}
              </>
            )}
          </View>
          <Pressable disabled={isSending} onPress={handleClose} style={styles.cancelButton}>
            <AppText style={styles.cancelText} variant="body">
              İptal
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  wrap: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    maxHeight: "62%",
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: theme.colors.border,
    borderRadius: 999,
    height: 4,
    marginTop: theme.spacing.sm,
    width: 40,
  },
  title: {
    color: theme.colors.textPrimary,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    textAlign: "center",
  },
  optionRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  optionText: {
    color: theme.colors.textPrimary,
    flex: 1,
  },
  friendsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  stateText: {
    textAlign: "center",
  },
  friendList: {
    maxHeight: 360,
  },
  friendRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  friendBody: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    color: theme.colors.textPrimary,
  },
  friendUsername: {
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
  },
  cancelText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
});
