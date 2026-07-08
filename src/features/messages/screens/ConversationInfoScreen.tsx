import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { ExploreRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { MainTabParamList, MessagesStackParamList } from "../../../navigation/types";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import {
  getConversationInfo,
  getConversationMedia,
  searchConversationMessages,
} from "../services/messages.service";
import type { ConversationInfo, ConversationMessage } from "../types";
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
  hasSharedMediaPreview,
  resolveSharedMediaPreviewItems,
  SHARED_MEDIA_PREVIEW_LIMIT,
} from "../utils/sharedMediaPreview";

type Props = NativeStackScreenProps<MessagesStackParamList, "ConversationInfoScreen">;

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
};

function ActionRow({ icon, title, onPress }: ActionRowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.actionRow}>
      <Ionicons color={theme.colors.textPrimary} name={icon} size={22} />
      <AppText style={styles.actionRowTitle} variant="body">
        {title}
      </AppText>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
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

  const openProfile = () => {
    if (!info?.otherParticipant) {
      return;
    }

    const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
    tabNavigation?.navigate(TabRoutes.ExploreTab, {
      screen: ExploreRoutes.ExploreFeedScreen,
      params: {
        openUser: {
          id: info.otherParticipant.id,
          username: info.otherParticipant.username,
          displayName: info.otherParticipant.displayName,
          avatarUrl: info.otherParticipant.avatarUrl,
          isOrganizer: info.otherParticipant.isOrganizer,
        },
      },
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
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Sohbet Detayı" />
          <Card style={styles.stateCard}>
            <Loader label="Sohbet detayı yükleniyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !info) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Sohbet Detayı" />
          <Card style={styles.stateCard}>
            <ErrorState onRetry={() => void loadInfo()} subtitle={error ?? undefined} title="Sohbet detayı yüklenemedi" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Sohbet Detayı" />

        <Card style={styles.profileCard}>
          <Avatar
            initials={displayTitle.slice(0, 2).toUpperCase()}
            size={88}
            uri={isSystemInbox ? undefined : info.otherParticipant?.avatarUrl}
          />
          <AppText style={styles.profileName} variant="sectionTitle">
            {displayTitle}
          </AppText>
          {info.otherParticipant?.username ? (
            <AppText style={styles.profileUsername} variant="caption">
              @{info.otherParticipant.username}
            </AppText>
          ) : null}
          {isSystemInbox ? (
            <AppText style={styles.systemDescription} variant="bodyMuted">
              Tourist sistem bildirimleri ve güncellemeleri bu sohbet üzerinden iletilir.
            </AppText>
          ) : null}
          {info.otherParticipant && !isSystemInbox ? (
            <Pressable onPress={openProfile} style={styles.profileButton}>
              <AppText style={styles.profileButtonText} variant="label">
                Profili Görüntüle
              </AppText>
            </Pressable>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <ActionRow
            icon="search-outline"
            onPress={() => setIsSearchOpen((current) => !current)}
            title="Sohbette Ara"
          />
          <View style={styles.sectionDivider} />
          <ActionRow
            icon="images-outline"
            onPress={() => {
              if (showAllMedia) {
                setShowAllMedia(false);
                return;
              }
              void loadAllMedia();
            }}
            title={showAllMedia ? "Önizlemeyi Göster" : "Ortak Medya"}
          />
        </Card>

        {isSearchOpen ? (
          <Card style={styles.sectionCard}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
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
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <View style={styles.mediaHeader}>
            <AppText variant="label">Ortak Medya</AppText>
            {!showAllMedia && hasSharedMediaPreview(previewMedia) ? (
              <Pressable onPress={() => void loadAllMedia()}>
                <AppText style={styles.mediaLink} variant="caption">
                  Tümünü Gör
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
                <View key={item.id} style={styles.mediaTile}>
                  {item.mediaUrl ? (
                    <Image resizeMode="cover" source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  pagePadding: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  stateCard: {
    padding: theme.spacing.xl,
  },
  profileCard: {
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  profileName: {
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  profileUsername: {
    color: theme.colors.textSecondary,
  },
  systemDescription: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  profileButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  profileButtonText: {
    color: theme.colors.primary,
  },
  sectionCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  actionRowTitle: {
    flex: 1,
  },
  sectionDivider: {
    backgroundColor: theme.colors.border,
    height: 1,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchHint: {
    color: theme.colors.textSecondary,
  },
  searchResultRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
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
  mediaHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
    textAlign: "center",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  mediaTile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    height: 96,
    overflow: "hidden",
    width: "31%",
  },
  mediaImage: {
    height: "100%",
    width: "100%",
  },
});
