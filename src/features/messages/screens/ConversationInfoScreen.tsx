import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { MessagesStackParamList } from "../../../navigation/types";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import {
  getConversationInfo,
  getConversationMedia,
  searchConversationMessages,
} from "../services/messages.service";
import type { ConversationInfo, ConversationMessage } from "../types";
import {
  buildMessageUserProfileParams,
  canOpenMessageUserProfile,
} from "../utils/conversationInfoNavigation";
import {
  beginConversationSearchRequest,
  CONVERSATION_MEDIA_ERROR_MESSAGE,
  CONVERSATION_SEARCH_DEBOUNCE_MS,
  createInvalidatedConversationSearchState,
  shouldApplyConversationSearchResponse,
  shouldExecuteConversationSearch,
  shouldInvalidateConversationSearch,
} from "../utils/conversationInfoSearch";
import {
  CONVERSATION_INFO_MEDIA_GRID_COLUMNS,
} from "../utils/conversationInfoLayout";
import {
  hasSharedMediaPreview,
  resolveSharedMediaPreviewItems,
  SHARED_MEDIA_PREVIEW_LIMIT,
} from "../utils/sharedMediaPreview";

type Props = NativeStackScreenProps<MessagesStackParamList, "ConversationInfoScreen">;

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
};

function QuickAction({ icon, label, disabled, onPress }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        disabled && styles.quickActionDisabled,
        pressed && !disabled && styles.quickActionPressed,
      ]}
    >
      <View style={styles.quickActionIconWrap}>
        <Ionicons
          color={disabled ? theme.colors.muted : theme.colors.textPrimary}
          name={icon}
          size={24}
        />
      </View>
      <AppText
        numberOfLines={1}
        style={[styles.quickActionLabel, disabled && styles.quickActionLabelDisabled]}
        variant="caption"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const formatMessageDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveDisplayTitle = (info: ConversationInfo | null, viewerId: string) => {
  if (!info) {
    return "Sohbet";
  }
  if (info.conversation.metadata?.isSystemInbox === "true") {
    return "Tourist";
  }
  if (info.otherParticipant?.displayName) {
    return info.otherParticipant.displayName;
  }
  if (info.conversation.title) {
    return info.conversation.title;
  }
  const others = info.conversation.participants.filter((participant) => participant.id !== viewerId);
  return others.map((participant) => participant.displayName).join(", ") || "Sohbet";
};

export function ConversationInfoScreen({ navigation, route }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const viewerId = user?.id ?? "";
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [allMedia, setAllMedia] = useState<ConversationMessage[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);

  const invalidateSearchRequests = useCallback(() => {
    searchRequestIdRef.current = beginConversationSearchRequest(searchRequestIdRef.current);
  }, []);

  const resetSearchState = useCallback(() => {
    invalidateSearchRequests();
    const cleared = createInvalidatedConversationSearchState();
    setSearchResults(cleared.searchResults);
    setSearchError(cleared.searchError);
    setIsSearching(cleared.isSearching);
  }, [invalidateSearchRequests]);

  const clearSearchDebounce = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }, []);

  const loadInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await getConversationInfo(route.params.threadId);
      setInfo(next);
      setError(null);
    } catch {
      setInfo(null);
      setError("Sohbet detayı yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [route.params.threadId]);

  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  useMessagesRealtime({
    onConversationUpdated: (event) => {
      if (event.payload.conversation.id !== route.params.threadId) {
        return;
      }
      void loadInfo();
    },
    onMessageNew: (event) => {
      if (event.payload.conversationId !== route.params.threadId) {
        return;
      }
      void loadInfo();
    },
  });

  const isSystemInbox = info?.conversation.metadata?.isSystemInbox === "true";
  const displayTitle = useMemo(() => resolveDisplayTitle(info, viewerId), [info, viewerId]);
  const previewMedia = useMemo(
    () => resolveSharedMediaPreviewItems(info?.sharedMediaPreview ?? [], SHARED_MEDIA_PREVIEW_LIMIT),
    [info?.sharedMediaPreview],
  );
  const mediaItems = showAllMedia ? allMedia : previewMedia;
  const canOpenProfile = canOpenMessageUserProfile(info?.otherParticipant, isSystemInbox);

  const mediaTileSize = useMemo(() => {
    const horizontalPadding = theme.spacing.lg * 2;
    const gap = theme.spacing.xs;
    const totalGaps = gap * (CONVERSATION_INFO_MEDIA_GRID_COLUMNS - 1);
    return (screenWidth - horizontalPadding - totalGaps) / CONVERSATION_INFO_MEDIA_GRID_COLUMNS;
  }, [screenWidth]);

  const openProfile = () => {
    if (!info?.otherParticipant || !canOpenProfile) {
      return;
    }

    navigation.navigate(
      MessagesRoutes.MessageUserProfileScreen,
      buildMessageUserProfileParams(info.otherParticipant, route.params.threadId),
    );
  };

  const toggleSearch = () => {
    setIsSearchOpen((current) => {
      if (current) {
        setSearchQuery("");
        resetSearchState();
      }
      return !current;
    });
  };

  const loadAllMedia = async () => {
    if (isMediaLoading) {
      return;
    }

    setMediaError(null);
    setIsMediaLoading(true);
    try {
      const result = await getConversationMedia(route.params.threadId, 1);
      setAllMedia(result.messages);
      setShowAllMedia(true);
      setMediaError(null);
    } catch {
      setMediaError(CONVERSATION_MEDIA_ERROR_MESSAGE);
    } finally {
      setIsMediaLoading(false);
    }
  };

  useEffect(() => {
    if (shouldInvalidateConversationSearch(searchQuery, isSearchOpen)) {
      clearSearchDebounce();
      resetSearchState();
      return undefined;
    }

    clearSearchDebounce();
    setIsSearching(true);

    const requestId = beginConversationSearchRequest(searchRequestIdRef.current);
    searchRequestIdRef.current = requestId;

    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const result = await searchConversationMessages(route.params.threadId, searchQuery);
          if (!shouldApplyConversationSearchResponse(searchRequestIdRef.current, requestId)) {
            return;
          }

          setSearchResults(result.messages);
          setSearchError(null);
        } catch {
          if (!shouldApplyConversationSearchResponse(searchRequestIdRef.current, requestId)) {
            return;
          }

          setSearchResults([]);
          setSearchError("Arama yapılamadı.");
        } finally {
          if (shouldApplyConversationSearchResponse(searchRequestIdRef.current, requestId)) {
            setIsSearching(false);
          }
        }
      })();
    }, CONVERSATION_SEARCH_DEBOUNCE_MS);

    return () => {
      clearSearchDebounce();
      searchRequestIdRef.current = beginConversationSearchRequest(searchRequestIdRef.current);
    };
  }, [clearSearchDebounce, isSearchOpen, resetSearchState, route.params.threadId, searchQuery]);

  const onSearchResultPress = () => {
    navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: route.params.threadId });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
          </Pressable>
        </View>
        <View style={styles.stateWrap}>
          <Loader label="Sohbet detayı yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !info) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
          </Pressable>
          <AppText style={styles.headerTitle} variant="label">
            Sohbet Detayı
          </AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.stateWrap}>
          <ErrorState onRetry={() => void loadInfo()} subtitle={error ?? undefined} title="Sohbet detayı yüklenemedi" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
        </Pressable>
        <AppText style={styles.headerTitle} variant="label">
          Sohbet Detayı
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Avatar
            initials={displayTitle.slice(0, 2).toUpperCase()}
            size={96}
            uri={isSystemInbox ? undefined : info.otherParticipant?.avatarUrl}
          />
          <AppText style={styles.heroName} variant="title">
            {displayTitle}
          </AppText>
          {info.otherParticipant?.username ? (
            <AppText style={styles.heroUsername} variant="caption">
              @{info.otherParticipant.username}
            </AppText>
          ) : null}
          {isSystemInbox ? (
            <AppText style={styles.heroSubtitle} variant="bodyMuted">
              Tourist sistem bildirimleri ve güncellemeleri bu sohbet üzerinden iletilir.
            </AppText>
          ) : null}
        </View>

        <View style={styles.quickActionsRow}>
          <QuickAction
            disabled={!canOpenProfile}
            icon="person-outline"
            label="Profil"
            onPress={canOpenProfile ? openProfile : undefined}
          />
          <QuickAction icon="search-outline" label="Ara" onPress={toggleSearch} />
        </View>

        {isSearchOpen ? (
          <View style={styles.searchSection}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onChangeText={setSearchQuery}
              placeholder="Mesajlarda ara..."
              placeholderTextColor={theme.colors.muted}
              style={styles.searchInput}
              value={searchQuery}
            />
            {!shouldExecuteConversationSearch(searchQuery) ? (
              <AppText style={styles.searchHint} variant="caption">
                Aramak için en az 2 karakter yazın.
              </AppText>
            ) : null}
            {isSearching ? <Loader label="Aranıyor..." /> : null}
            {searchError ? (
              <AppText style={styles.searchHint} variant="caption">
                {searchError}
              </AppText>
            ) : null}
            {!isSearching && shouldExecuteConversationSearch(searchQuery) && searchResults.length === 0 ? (
              <EmptyState subtitle="Bu sohbette eşleşen mesaj bulunamadı." title="Sonuç yok" />
            ) : null}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable onPress={onSearchResultPress} style={styles.searchResultRow}>
                  <View style={styles.searchResultHeader}>
                    <AppText variant="label">{item.sender.displayName}</AppText>
                    <AppText style={styles.searchResultDate} variant="caption">
                      {formatMessageDate(item.createdAt)}
                    </AppText>
                  </View>
                  <AppText numberOfLines={2} variant="body">
                    {item.text || "📷 Fotoğraf"}
                  </AppText>
                </Pressable>
              )}
              scrollEnabled={false}
            />
          </View>
        ) : null}

        <View style={styles.mediaSection}>
          <View style={styles.mediaHeader}>
            <AppText style={styles.mediaTitle} variant="label">
              Ortak medya
            </AppText>
            {!showAllMedia && hasSharedMediaPreview(previewMedia) ? (
              <Pressable onPress={() => void loadAllMedia()}>
                <AppText style={styles.mediaLink} variant="caption">
                  Tümünü Gör
                </AppText>
              </Pressable>
            ) : showAllMedia ? (
              <Pressable onPress={() => setShowAllMedia(false)}>
                <AppText style={styles.mediaLink} variant="caption">
                  Önizleme
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {isMediaLoading ? <Loader label="Medya yükleniyor..." /> : null}
          {mediaError ? (
            <AppText style={styles.mediaErrorText} variant="caption">
              {mediaError}
            </AppText>
          ) : null}

          {!isMediaLoading && !mediaError && mediaItems.length === 0 ? (
            <AppText style={styles.emptyMediaText} variant="bodyMuted">
              Henüz ortak medya yok
            </AppText>
          ) : (
            <View style={styles.mediaGrid}>
              {mediaItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.mediaTile, { height: mediaTileSize, width: mediaTileSize }]}
                >
                  {item.mediaUrl ? (
                    <Image resizeMode="cover" source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  backButton: {
    padding: theme.spacing.xs,
    width: 44,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  headerSpacer: {
    width: 44,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  heroName: {
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  heroUsername: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    textAlign: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  quickAction: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.xs,
  },
  quickActionPressed: {
    opacity: 0.7,
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  quickActionIconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  quickActionLabel: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    textAlign: "center",
  },
  quickActionLabelDisabled: {
    color: theme.colors.muted,
  },
  searchSection: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchHint: {
    color: theme.colors.textSecondary,
  },
  searchResultRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  searchResultHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchResultDate: {
    color: theme.colors.textSecondary,
  },
  mediaSection: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  mediaHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  mediaTitle: {
    color: theme.colors.textPrimary,
  },
  mediaLink: {
    color: theme.colors.primary,
  },
  mediaErrorText: {
    color: theme.colors.danger,
    textAlign: "center",
  },
  emptyMediaText: {
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
    textAlign: "center",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  mediaTile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
  },
  mediaImage: {
    height: "100%",
    width: "100%",
  },
});
