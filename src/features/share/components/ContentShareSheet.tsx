import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { loadShareFriendTargets, sendContentToFriend, shareContentSystem } from "../services/contentShare.service";
import type { ContentSharePayload, ShareFriendTarget } from "../types/contentShare";
import { buildContentShareMessage } from "../utils/buildContentShareMessage";

type ContentShareSheetProps = {
  visible: boolean;
  payload: ContentSharePayload | null;
  onClose: () => void;
};

type ShareIconOptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  circleColor?: string;
  onPress: () => void;
};

const SHEET_SLIDE_DISTANCE = 480;
const ANIMATION_OPEN_MS = 240;
const ANIMATION_CLOSE_MS = 200;
const GRID_COLUMNS = 3;
const AVATAR_SIZE = 70;

const SHEET_COLORS = {
  background: theme.colors.surfaceElevated,
  surface: theme.colors.surface,
  textPrimary: theme.colors.textPrimary,
  textSecondary: theme.colors.textSecondary,
  handle: theme.colors.border,
  placeholder: theme.colors.muted,
};

function ShareIconOption({
  icon,
  label,
  disabled = false,
  circleColor = SHEET_COLORS.surface,
  onPress,
}: ShareIconOptionProps) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.iconOption}>
      <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
        <Ionicons color={SHEET_COLORS.textPrimary} name={icon} size={24} />
      </View>
      <AppText numberOfLines={2} style={styles.iconLabel} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

export function ContentShareSheet({ visible, payload, onClose }: ContentShareSheetProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [friends, setFriends] = useState<ShareFriendTarget[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_SLIDE_DISTANCE)).current;

  const gridCellWidth = (windowWidth - theme.spacing.lg * 2) / GRID_COLUMNS;

  const filteredFriends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return friends;
    }

    return friends.filter(
      (friend) =>
        friend.displayName.toLowerCase().includes(query) ||
        (friend.username?.toLowerCase().includes(query) ?? false),
    );
  }, [friends, searchQuery]);

  const animateOpen = () => {
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(SHEET_SLIDE_DISTANCE);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ANIMATION_OPEN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: ANIMATION_OPEN_MS,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = (onFinished?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_CLOSE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_SLIDE_DISTANCE,
        duration: ANIMATION_CLOSE_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onFinished?.();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      requestAnimationFrame(() => {
        animateOpen();
      });
      return;
    }

    if (modalVisible) {
      animateClose(() => setModalVisible(false));
    }
  }, [visible, modalVisible]);

  useEffect(() => {
    if (!visible) {
      setFriends([]);
      setSearchQuery("");
      setFriendsError(null);
      setIsLoadingFriends(false);
      setIsSending(false);
      return;
    }

    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const loadFriends = async () => {
      setIsLoadingFriends(true);
      setFriendsError(null);

      try {
        const targets = await loadShareFriendTargets(user.id);
        if (!cancelled) {
          setFriends(targets);
        }
      } catch (error) {
        if (!cancelled) {
          setFriends([]);
          setFriendsError(error instanceof Error ? error.message : "Arkadaş listesi yüklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFriends(false);
        }
      }
    };

    void loadFriends();

    return () => {
      cancelled = true;
    };
  }, [visible, user?.id]);

  const handleClose = () => {
    if (isSending) {
      return;
    }
    onClose();
  };

  const handleSystemShare = async () => {
    if (!payload) {
      return;
    }

    handleClose();
    await shareContentSystem(payload);
  };

  const handleCopyLink = async () => {
    if (!payload) {
      return;
    }

    const text = buildContentShareMessage(payload);
    await Clipboard.setStringAsync(text);
    Alert.alert("Kopyalandı", "Bağlantı panoya kopyalandı.");
  };

  const handleSendToFriend = async (target: ShareFriendTarget) => {
    if (!payload || !user?.id || isSending) {
      if (!user?.id) {
        Alert.alert("Giriş gerekli", "Arkadaşına göndermek için giriş yapmalısın.");
      }
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

  const renderFriendGrid = () => {
    if (!user?.id) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.stateText} variant="bodyMuted">
            Arkadaşına göndermek için giriş yapmalısın.
          </AppText>
        </View>
      );
    }

    if (isLoadingFriends) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }

    if (friendsError) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.stateText} variant="bodyMuted">
            {friendsError}
          </AppText>
        </View>
      );
    }

    if (friends.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.stateText} variant="bodyMuted">
            Henüz mesajlaştığın bir arkadaş yok.
          </AppText>
        </View>
      );
    }

    if (filteredFriends.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.stateText} variant="bodyMuted">
            Sonuç bulunamadı.
          </AppText>
        </View>
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.gridContent}
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        numColumns={GRID_COLUMNS}
        renderItem={({ item }) => {
          const initials = item.displayName.slice(0, 2).toUpperCase();
          return (
            <Pressable
              disabled={isSending}
              onPress={() => void handleSendToFriend(item)}
              style={[styles.gridCell, { width: gridCellWidth }]}
            >
              <Avatar initials={initials} size={AVATAR_SIZE} uri={item.avatarUrl} />
              <AppText numberOfLines={2} style={styles.gridName} variant="caption">
                {item.displayName}
              </AppText>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.gridList}
      />
    );
  };

  return (
    <Modal animationType="none" onRequestClose={handleClose} transparent visible={modalVisible}>
      <View style={styles.root}>
        <Pressable disabled={isSending} onPress={handleClose} style={StyleSheet.absoluteFill}>
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons color={SHEET_COLORS.placeholder} name="search" size={18} style={styles.searchIcon} />
              <TextInput
                editable={!isSending}
                placeholder="Ara"
                placeholderTextColor={SHEET_COLORS.placeholder}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable disabled={isSending} style={styles.groupButton}>
              <Ionicons color={SHEET_COLORS.textPrimary} name="person-add-outline" size={22} />
            </Pressable>
          </View>

          <View style={styles.gridSection}>{renderFriendGrid()}</View>

          <ScrollView
            contentContainerStyle={styles.iconRowContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.iconRow}
          >
            <ShareIconOption
              disabled={isSending}
              icon="link-outline"
              label="Bağlantıyı kopyala"
              onPress={() => void handleCopyLink()}
            />
            <ShareIconOption
              disabled={isSending}
              icon="share-outline"
              label="Paylaş"
              onPress={() => void handleSystemShare()}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: SHEET_COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "78%",
    minHeight: 420,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: SHEET_COLORS.handle,
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    width: 36,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  searchInputWrap: {
    alignItems: "center",
    backgroundColor: SHEET_COLORS.surface,
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    height: 40,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    color: SHEET_COLORS.textPrimary,
    flex: 1,
    fontSize: 15,
    height: 40,
    padding: 0,
  },
  groupButton: {
    alignItems: "center",
    backgroundColor: SHEET_COLORS.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  gridSection: {
    flex: 1,
    minHeight: 180,
  },
  gridList: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  gridCell: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  gridName: {
    color: SHEET_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  stateWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  stateText: {
    color: SHEET_COLORS.textSecondary,
    textAlign: "center",
  },
  iconRow: {
    flexGrow: 0,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconRowContent: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  iconOption: {
    alignItems: "center",
    maxWidth: 88,
    width: 80,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 30,
    height: 56,
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
    width: 56,
  },
  iconLabel: {
    color: SHEET_COLORS.textPrimary,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
});
