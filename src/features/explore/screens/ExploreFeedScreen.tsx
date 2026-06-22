import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { ExploreRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ExploreStackParamList, MainTabParamList } from "../../../navigation/types";
import { ProfileContentTabs } from "../../profile/components/ProfileContentTabs";
import { ProfileAvatarRing } from "../../profile/components/ProfileAvatarRing";
import { ProfileHighlightRow } from "../../profile/components/ProfileHighlightRow";
import type { StoryHighlightItem } from "../../profile/components/ProfileEventHighlights";
import { ProfileStatsRow } from "../../profile/components/ProfileStatsRow";
import { getOrCreateDirectConversation } from "../../messages/services/messages.service";
import { ExplorePostCard } from "../components/ExplorePostCard";
import type { AudienceMode } from "../services/audienceMode";
import { buildLoadExploreFeedInput, hasRequiredContext, reduceExploreViewState } from "../services/audienceMode";
import { loadExploreFeed } from "../services/explore.service";
import { searchUsers } from "../services/userSearch.service";
import type { ExploreFeedScope, ExplorePost } from "../types";

type MockComment = {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
  likes: number;
  parentCommentId?: string;
};
type LegacyComment = string;
type ReplyTarget = { commentId: string; author: string };
type ExploreSearchUser = {
  id: string;
  username: string;
  displayName: string;
  countryCode: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
  isFollowing?: boolean;
  hasNewPosts?: boolean;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SEARCH_PROFILE_STORY_HIGHLIGHTS: StoryHighlightItem[] = [
  {
    id: "story_highlight_food",
    title: "Food memories",
    coverImageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
    stories: [
      {
        id: "story_food_1",
        imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
        caption: "We met amazing people from different communities in Berlin.",
        createdAt: "2026-05-24T18:15:00.000Z",
      },
      {
        id: "story_food_2",
        imageUrl: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
        caption: "The food stands and live music were incredible.",
        createdAt: "2026-05-24T19:05:00.000Z",
      },
    ],
  },
  {
    id: "story_highlight_city",
    title: "City walks",
    coverImageUrl: "https://images.unsplash.com/photo-1526481280695-3c469d92f4d6?auto=format&fit=crop&w=1200&q=80",
    stories: [
      {
        id: "story_walk_1",
        imageUrl: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1200&q=80",
        caption: "Explored hidden streets and coffee spots with new friends.",
        createdAt: "2026-05-18T16:11:00.000Z",
      },
    ],
  },
];

function CommentLikeButton({
  liked,
  count,
  onPress,
}: {
  liked: boolean;
  count: number;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!liked) {
      return;
    }
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [liked, scale]);

  return (
    <Pressable onPress={onPress} style={styles.commentLikeWrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons color={liked ? "#FF375F" : "#9CA3AF"} name={liked ? "heart" : "heart-outline"} size={18} />
      </Animated.View>
      <AppText style={[styles.commentLikeCount, liked && styles.commentLikeCountActive]} variant="caption">
        {count}
      </AppText>
    </Pressable>
  );
}

export function ExploreFeedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<ExploreStackParamList>>();
  const { height } = useWindowDimensions();
  const [viewState, dispatchViewState] = useReducer(reduceExploreViewState, {
    scope: "city" as ExploreFeedScope,
    audienceMode: "community" as AudienceMode,
  });
  const { scope, audienceMode } = viewState;
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<ExplorePost | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Array<MockComment | LegacyComment>>>({});
  const [postLikesById, setPostLikesById] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [commentLikesById, setCommentLikesById] = useState<Record<string, boolean>>({});
  const [draftComment, setDraftComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExploreSearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchUsersError, setSearchUsersError] = useState<string | null>(null);
  const [isAudienceMenuOpen, setIsAudienceMenuOpen] = useState(false);
  const [feedViewportHeight, setFeedViewportHeight] = useState(0);
  const [dismissedSearchUserIds, setDismissedSearchUserIds] = useState<string[]>([]);
  const [selectedSearchUser, setSelectedSearchUser] = useState<ExploreSearchUser | null>(null);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const audienceAnim = useRef(new Animated.Value(0)).current;

  const openSearchUserProfile = (searchUser: ExploreSearchUser) => {
    setIsSearchOpen(false);
    // Avoid modal stacking race: open profile after search modal fully starts closing.
    setTimeout(() => {
      setSelectedSearchUser(searchUser);
    }, 120);
  };
  const toggleFollowUser = (userId: string) => {
    setFollowedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };
  const openDirectMessage = async (targetUser: ExploreSearchUser) => {
    if (!user?.id) {
      return;
    }
    try {
      const conversation = await getOrCreateDirectConversation({
        viewer: {
          id: user.id,
          displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
        },
        target: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          avatarUrl: targetUser.avatarUrl,
        },
      });
      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.MessagesTab, {
        screen: MessagesRoutes.MessageThreadScreen,
        params: { threadId: conversation.id },
      });
    } catch {
      // Keep silent for now; we can add a toast/message layer later.
    }
  };

  const feedContext = useMemo(
    () => ({
      community: user?.publicProfile?.homeCommunity ?? "",
      countryCode: user?.privateProfile?.destinationCountryCode ?? "",
      city: user?.publicProfile?.currentCity ?? "",
    }),
    [user?.publicProfile?.homeCommunity, user?.privateProfile?.destinationCountryCode, user?.publicProfile?.currentCity],
  );
  const scopeLabels = useMemo(
    () => ({
      city: feedContext.city || "Şehir",
      country: feedContext.countryCode || "Ülke",
    }),
    [feedContext.city, feedContext.countryCode],
  );
  const audienceLabel = audienceMode === "community" ? "Your community" : "Global";
  const trimmedSearchQuery = searchQuery.trim();
  const searchableUsers = useMemo(
    () =>
      searchResults
        .filter((item) => !dismissedSearchUserIds.includes(item.id))
        .map((item) => ({
          ...item,
          isFollowing: followedUserIds.includes(item.id),
        })),
    [dismissedSearchUserIds, followedUserIds, searchResults],
  );

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    if (!trimmedSearchQuery) {
      setSearchResults([]);
      setSearchUsersError(null);
      setIsSearchingUsers(false);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        setIsSearchingUsers(true);
        setSearchUsersError(null);
        try {
          const results = await searchUsers(trimmedSearchQuery);
          setSearchResults(
            results.map((item) => ({
              id: item.id,
              username: item.username,
              displayName: item.displayName,
              countryCode: "",
              avatarUrl: item.avatarUrl,
            })),
          );
        } catch {
          setSearchResults([]);
          setSearchUsersError("Kullanıcı araması başarısız oldu.");
        } finally {
          setIsSearchingUsers(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [isSearchOpen, trimmedSearchQuery]);
  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }
    setDismissedSearchUserIds([]);
  }, [isSearchOpen]);
  useEffect(() => {
    Animated.timing(audienceAnim, {
      toValue: isAudienceMenuOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [audienceAnim, isAudienceMenuOpen]);

  const fetchFeed = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!hasRequiredContext(feedContext, audienceMode)) {
        setPosts([]);
        setError(null);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await loadExploreFeed(
          buildLoadExploreFeedInput({
            scope,
            audienceMode,
            context: feedContext,
          }),
        );
        setPosts(result);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load explore feed.";
        setPosts([]);
        setError(message);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [audienceMode, feedContext.city, feedContext.community, feedContext.countryCode, scope],
  );

  useEffect(() => {
    void fetchFeed("initial");
  }, [fetchFeed]);

  useEffect(() => {
    if (posts.length === 0) {
      return;
    }
    setPostLikesById((prev) => {
      const next = { ...prev };
      posts.forEach((post) => {
        if (!next[post.id]) {
          next[post.id] = {
            liked: Boolean(post.viewerState.liked),
            count: post.stats.likeCount,
          };
        }
      });
      return next;
    });
  }, [posts]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator color="#FFFFFF" />
          <AppText style={styles.stateText} variant="bodyMuted">
            Discovering posts around you...
          </AppText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.errorTitle} variant="sectionTitle">
            Could not load feed
          </AppText>
          <AppText style={styles.stateText} variant="bodyMuted">
            {error}
          </AppText>
          <Pressable onPress={() => void fetchFeed("initial")} style={styles.retryButton}>
            <AppText style={styles.retryText} variant="label">
              Retry
            </AppText>
          </Pressable>
        </View>
      );
    }

    if (!hasRequiredContext(feedContext, audienceMode)) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.errorTitle} variant="sectionTitle">
            Location context needed
          </AppText>
          <AppText style={styles.stateText} variant="bodyMuted">
            {audienceMode === "community"
              ? "Complete onboarding community and location to unlock your community feed."
              : "Complete onboarding location to unlock global nearby discovery."}
          </AppText>
        </View>
      );
    }

    if (posts.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <AppText style={styles.errorTitle} variant="sectionTitle">
            No matching content
          </AppText>
          <AppText style={styles.stateText} variant="bodyMuted">
            {scope === "city" ? "Try the country feed for a broader view." : "Check back shortly."}
          </AppText>
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, index) => {
          const length = feedViewportHeight > 0 ? feedViewportHeight : height;
          return { index, length, offset: length * index };
        }}
        keyExtractor={(item) => item.id}
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0 && nextHeight !== feedViewportHeight) {
            setFeedViewportHeight(nextHeight);
          }
        }}
        onRefresh={() => void fetchFeed("refresh")}
        pagingEnabled
        refreshing={refreshing}
        renderItem={({ item }) => (
          <ExplorePostCard
            height={feedViewportHeight > 0 ? feedViewportHeight : height}
            isLiked={postLikesById[item.id]?.liked ?? item.viewerState.liked}
            likeCount={postLikesById[item.id]?.count ?? item.stats.likeCount}
            onAuthorPress={() =>
              setSelectedSearchUser({
                id: item.author.id,
                username: item.author.displayName,
                displayName: item.author.displayName,
                countryCode: item.countryCode,
                city: item.city,
                avatarUrl: item.author.avatarUrl,
                bio: `${item.author.displayName} adlı kullanıcı Tourist topluluğunda içerik paylaşıyor.`,
              })
            }
            onCommentPress={() => {
              setActiveCommentsPost(item);
              setReplyTarget(null);
              setDraftComment("");
              setCommentsByPost((prev) => {
                if (prev[item.id]) {
                  return prev;
                }
                return {
                  ...prev,
                  [item.id]: [
                    {
                      id: `${item.id}_comment_1`,
                      author: "Katie",
                      text: "Looks amazing 👏",
                      timeAgo: "5h",
                      likes: 196,
                      parentCommentId: undefined,
                    },
                    {
                      id: `${item.id}_comment_2`,
                      author: "John",
                      text: "I was there last week! Great vibe and people.",
                      timeAgo: "4h",
                      likes: 91,
                      parentCommentId: undefined,
                    },
                    {
                      id: `${item.id}_comment_3`,
                      author: "Alexis",
                      text: "Great recommendation, thanks 🙌",
                      timeAgo: "3h",
                      likes: 23,
                      parentCommentId: undefined,
                    },
                  ],
                };
              });
            }}
            onLikePress={() => togglePostLike(item)}
            post={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.feedList}
      />
    );
  };

  const activeCommentsRaw = activeCommentsPost ? commentsByPost[activeCommentsPost.id] ?? [] : [];
  const activeComments = useMemo<MockComment[]>(
    () =>
      activeCommentsRaw.map((comment, index) => {
        if (typeof comment === "string") {
          return {
            id: `legacy_${index}`,
            author: "Community",
            text: comment,
            timeAgo: "now",
            likes: 0,
            parentCommentId: undefined,
          };
        }
        return {
          id: comment.id || `comment_${index}`,
          author: comment.author || "Community",
          text: comment.text || "",
          timeAgo: comment.timeAgo || "now",
          likes: Number.isFinite(comment.likes) ? comment.likes : 0,
          parentCommentId: comment.parentCommentId,
        };
      }),
    [activeCommentsRaw],
  );
  const topLevelComments = useMemo(
    () => activeComments.filter((comment) => !comment.parentCommentId),
    [activeComments],
  );
  const repliesByParent = useMemo(() => {
    const grouped: Record<string, MockComment[]> = {};
    activeComments.forEach((comment) => {
      if (!comment.parentCommentId) {
        return;
      }
      if (!grouped[comment.parentCommentId]) {
        grouped[comment.parentCommentId] = [];
      }
      grouped[comment.parentCommentId].push(comment);
    });
    return grouped;
  }, [activeComments]);
  const togglePostLike = (post: ExplorePost) => {
    setPostLikesById((prev) => {
      const current = prev[post.id] ?? {
        liked: Boolean(post.viewerState.liked),
        count: post.stats.likeCount,
      };
      const nextLiked = !current.liked;
      return {
        ...prev,
        [post.id]: {
          liked: nextLiked,
          count: Math.max(0, current.count + (nextLiked ? 1 : -1)),
        },
      };
    });
  };
  const toggleCommentLike = (commentId: string) => {
    setCommentLikesById((prev) => ({
      ...prev,
      [commentId]: !(prev[commentId] ?? false),
    }));
  };
  const submitComment = () => {
    if (!activeCommentsPost) {
      return;
    }
    const clean = draftComment.trim();
    if (!clean) {
      return;
    }
    setCommentsByPost((prev) => {
      const previous = (prev[activeCommentsPost.id] ?? []).map((comment, index) =>
        typeof comment === "string"
          ? ({
              id: `legacy_${index}`,
              author: "Community",
              text: comment,
              timeAgo: "now",
              likes: 0,
            } as MockComment)
          : comment,
      );

      return {
        ...prev,
        [activeCommentsPost.id]: [
          ...previous,
        {
          id: `${activeCommentsPost.id}_${Date.now()}`,
          author: "You",
          text: clean,
          timeAgo: "now",
          likes: 0,
            parentCommentId: replyTarget?.commentId,
        },
      ],
      };
    });
    setDraftComment("");
    setReplyTarget(null);
  };
  const cancelReply = () => {
    setReplyTarget((prev) => {
      if (!prev) {
        return null;
      }
      const replyPrefix = new RegExp(`^@${escapeRegex(prev.author)}\\s*`, "i");
      setDraftComment((current) => current.replace(replyPrefix, "").trimStart());
      return null;
    });
  };
  const composerInitials = (user?.publicProfile?.displayName || "TM").slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, selectedSearchUser ? styles.safeAreaLight : null]}>
      <View style={[styles.container, selectedSearchUser ? styles.containerLight : null]}>
        {selectedSearchUser ? (
          <ScrollView
            contentContainerStyle={styles.searchProfileScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.searchProfileContainer}>
              <View style={styles.searchProfileHeader}>
                <Pressable
                  onPress={() => {
                    setIsProfileMenuOpen(false);
                    setSelectedSearchUser(null);
                  }}
                  style={styles.searchProfileBack}
                >
                  <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
                </Pressable>
                <View style={styles.searchProfileHeaderCenter} />
                <View style={styles.searchProfileHeaderActions}>
                  <Pressable onPress={() => setIsProfileMenuOpen(true)} style={styles.searchProfileMoreButton}>
                    <Ionicons color={theme.colors.textPrimary} name="ellipsis-vertical" size={18} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.searchProfileIdentity}>
                <ProfileAvatarRing displayName={selectedSearchUser.displayName} showPlus={false} />
                <AppText style={styles.searchProfileDisplayName} variant="title">
                  {selectedSearchUser.displayName}
                </AppText>
                <AppText muted style={styles.searchProfileUsername} variant="bodyMuted">
                  @{selectedSearchUser.username}
                </AppText>
                <View style={styles.searchProfileLocationRow}>
                  <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
                  <AppText style={styles.searchProfileLocation} variant="bodyMuted">
                    {`${selectedSearchUser.city || "City"}, ${selectedSearchUser.countryCode || "Country"}`}
                  </AppText>
                </View>
                <AppText style={styles.searchProfileBio} variant="body">
                  {selectedSearchUser.bio ?? `${selectedSearchUser.displayName} is part of the Tourist community.`}
                </AppText>
              </View>

              <ProfileStatsRow events={14} helped={23} organized={5} />

              <Pressable style={styles.searchProfileInstagramButton}>
                <Ionicons color={theme.colors.textPrimary} name="logo-instagram" size={22} />
                <AppText style={styles.searchProfileInstagramText} variant="label">
                  Instagram Profile
                </AppText>
              </Pressable>
              <View style={styles.searchProfilePrimaryActions}>
                <Pressable
                  onPress={() => toggleFollowUser(selectedSearchUser.id)}
                  style={[
                    styles.followButton,
                    styles.searchProfilePrimaryActionButton,
                    followedUserIds.includes(selectedSearchUser.id) && styles.followButtonActive,
                  ]}
                >
                  <AppText
                    style={[
                      styles.followButtonText,
                      followedUserIds.includes(selectedSearchUser.id) && styles.followButtonTextActive,
                    ]}
                    variant="caption"
                  >
                    {followedUserIds.includes(selectedSearchUser.id) ? "Takiptesin" : "Takip Et"}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => void openDirectMessage(selectedSearchUser)}
                  style={[styles.messageButton, styles.searchProfilePrimaryActionButton]}
                >
                  <AppText style={styles.messageButtonText} variant="caption">
                    Mesaj
                  </AppText>
                </Pressable>
              </View>

              <ProfileHighlightRow highlights={SEARCH_PROFILE_STORY_HIGHLIGHTS} />

              <ProfileContentTabs />
            </View>
          </ScrollView>
        ) : (
          <>
            <View style={styles.scopeOverlay}>
              <View style={[styles.scopeSwitch, isAudienceMenuOpen && styles.scopeSwitchOpen]}>
                <View style={styles.cityScopeWrap}>
                  <Pressable onPress={() => setIsAudienceMenuOpen((prev) => !prev)} style={styles.chevronButton}>
                    <Ionicons color="#FFFFFF" name={isAudienceMenuOpen ? "chevron-up" : "chevron-down"} size={15} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      dispatchViewState({ type: "set_scope", scope: "city" });
                      setIsAudienceMenuOpen(false);
                    }}
                    style={styles.scopeButton}
                  >
                    <AppText style={[styles.scopeLabel, scope === "city" && styles.activeScopeLabel]} variant="label">
                      {scopeLabels.city}
                    </AppText>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {
                    dispatchViewState({ type: "set_scope", scope: "country" });
                    setIsAudienceMenuOpen(false);
                  }}
                  style={styles.scopeButton}
                >
                  <AppText style={[styles.scopeLabel, scope === "country" && styles.activeScopeLabel]} variant="label">
                    {scopeLabels.country}
                  </AppText>
                </Pressable>
              </View>
              <Animated.View
                pointerEvents={isAudienceMenuOpen ? "auto" : "none"}
                style={[
                  styles.audienceMenuAnimated,
                  {
                    opacity: audienceAnim,
                    maxHeight: audienceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 86],
                    }),
                    transform: [
                      {
                        translateY: audienceAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-6, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    dispatchViewState({ type: "set_audience_mode", audienceMode: "community" });
                    setIsAudienceMenuOpen(false);
                  }}
                  style={styles.audienceRow}
                >
                  <AppText style={styles.audienceText} variant="caption">
                    Your community
                  </AppText>
                  {audienceMode === "community" ? <Ionicons color="#FFFFFF" name="checkmark" size={15} /> : null}
                </Pressable>
                <Pressable
                  onPress={() => {
                    dispatchViewState({ type: "set_audience_mode", audienceMode: "global" });
                    setIsAudienceMenuOpen(false);
                  }}
                  style={styles.audienceRow}
                >
                  <AppText style={styles.audienceText} variant="caption">
                    Global
                  </AppText>
                  {audienceMode === "global" ? <Ionicons color="#FFFFFF" name="checkmark" size={15} /> : null}
                </Pressable>
              </Animated.View>
            </View>
            <Pressable onPress={() => navigation.navigate(ExploreRoutes.ExploreCameraScreen)} style={styles.cameraButton}>
              <Ionicons color="#FFFFFF" name="camera-outline" size={20} />
            </Pressable>
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setDismissedSearchUserIds([]);
                setIsSearchOpen(true);
              }}
              style={styles.searchButton}
            >
              <Ionicons color="#FFFFFF" name="search" size={20} />
            </Pressable>

            {renderContent()}
          </>
        )}
      </View>

      <Modal animationType="slide" onRequestClose={() => setIsSearchOpen(false)} visible={isSearchOpen}>
        <SafeAreaView style={styles.searchSafeArea}>
          <View style={styles.searchContainer}>
            <View style={styles.searchTopRow}>
              <View style={styles.searchInputWrap}>
                <Ionicons color="#64748B" name="search" size={18} />
                <TextInput
                  autoFocus
                  onChangeText={setSearchQuery}
                  placeholder="Ara"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={searchQuery}
                />
              </View>
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
              >
                <AppText style={styles.searchCancel} variant="body">
                  İptal
                </AppText>
              </Pressable>
            </View>

            <View style={styles.searchHeaderRow}>
              <AppText style={styles.searchHeaderTitle} variant="sectionTitle">
                {trimmedSearchQuery ? "Sonuçlar" : "Kullanıcı ara"}
              </AppText>
              {isSearchingUsers ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
            </View>

            <FlatList
              data={searchableUsers}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.searchEmptyState}>
                  <AppText muted variant="bodyMuted">
                    {searchUsersError
                      ? searchUsersError
                      : trimmedSearchQuery
                        ? "Sonuç bulunamadı."
                        : "Aramak için kullanıcı adı veya isim yaz."}
                  </AppText>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => openSearchUserProfile(item)} style={styles.searchUserRow}>
                  <Avatar initials={item.displayName.slice(0, 2).toUpperCase()} size={42} uri={item.avatarUrl} />
                  <View style={styles.searchUserText}>
                    <AppText style={styles.searchUsername} variant="label">
                      {item.username}
                    </AppText>
                    <AppText style={styles.searchMeta} variant="caption">
                      {item.displayName}
                      {item.isFollowing ? " · Takip ediyorsun" : ""}
                      {item.hasNewPosts ? " · yeni gönderi" : ""}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      setDismissedSearchUserIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]))
                    }}
                    style={styles.searchDismissButton}
                  >
                    <Ionicons color="#64748B" name="close" size={18} />
                  </Pressable>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </SafeAreaView>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => setIsProfileMenuOpen(false)}
        transparent
        visible={Boolean(selectedSearchUser) && isProfileMenuOpen}
      >
        <Pressable onPress={() => setIsProfileMenuOpen(false)} style={styles.profileMenuBackdrop}>
          <View style={styles.profileMenuWrap}>
            <Pressable style={styles.profileMenuSheet}>
              {[
                { label: "Şikayet Et", danger: true },
                { label: "Engelle" },
                { label: "Bu hesap hakkında" },
                { label: "Profilin URL'sini kopyala" },
                { label: "Bu profili paylaş" },
              ].map((item) => (
                <Pressable key={item.label} style={styles.profileMenuItem}>
                  <AppText style={[styles.profileMenuItemText, item.danger ? styles.profileMenuItemTextDanger : null]} variant="body">
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </Pressable>
            <Pressable onPress={() => setIsProfileMenuOpen(false)} style={styles.profileMenuCancel}>
              <AppText style={styles.profileMenuCancelText} variant="body">
                İptal
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => {
          setActiveCommentsPost(null);
          setReplyTarget(null);
        }}
        transparent
        visible={Boolean(activeCommentsPost)}
      >
        <Pressable
          onPress={() => {
            setActiveCommentsPost(null);
            setReplyTarget(null);
          }}
          style={styles.commentsBackdrop}
        >
          <Pressable onPress={() => undefined} style={styles.commentsSheet}>
            <View style={styles.commentsHandle} />
            <View style={styles.commentsSearchRow}>
              <AppText style={styles.commentsSearchLabel} variant="body">
                Search:
              </AppText>
              <AppText style={styles.commentsSearchQuery} variant="body">
                {activeCommentsPost?.text.slice(0, 24) || "community post"}
              </AppText>
            </View>
            <View style={styles.commentsHeaderRow}>
              <AppText style={styles.commentsTitle} variant="sectionTitle">
                {activeComments.length} comments
              </AppText>
              <Pressable onPress={() => setActiveCommentsPost(null)} style={styles.commentsClose}>
                <Ionicons color="#111827" name="close" size={20} />
              </Pressable>
            </View>
            <FlatList
              contentContainerStyle={styles.commentsList}
              data={topLevelComments}
              keyExtractor={(item, index) => item.id || `${item.author || "community"}_${index}`}
              renderItem={({ item }) => (
                <View style={styles.threadBlock}>
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <AppText style={styles.commentAvatarText} variant="caption">
                        {item.author.slice(0, 1).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={styles.commentBody}>
                      <AppText style={styles.commentUser} variant="label">
                        {item.author}
                      </AppText>
                      <AppText style={styles.commentText} variant="body">
                        {item.text}
                      </AppText>
                      <View style={styles.commentMetaRow}>
                        <AppText style={styles.commentMetaText} variant="caption">
                          {item.timeAgo}
                        </AppText>
                        <Pressable
                          onPress={() => {
                            setReplyTarget({ commentId: item.id, author: item.author });
                            setDraftComment((prev) => {
                              const mention = `@${item.author} `;
                              if (prev.trim().startsWith(`@${item.author}`)) {
                                return prev;
                              }
                              return `${mention}${prev}`.trimStart();
                            });
                          }}
                        >
                          <AppText style={styles.commentMetaText} variant="caption">
                            Reply
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                    <CommentLikeButton
                      count={Math.max(0, item.likes + (commentLikesById[item.id] ? 1 : 0))}
                      liked={Boolean(commentLikesById[item.id])}
                      onPress={() => toggleCommentLike(item.id)}
                    />
                  </View>

                  {(repliesByParent[item.id] ?? []).map((reply) => (
                    <View key={reply.id} style={styles.replyRow}>
                      <View style={[styles.commentAvatar, styles.replyAvatar]}>
                        <AppText style={styles.commentAvatarText} variant="caption">
                          {reply.author.slice(0, 1).toUpperCase()}
                        </AppText>
                      </View>
                      <View style={styles.commentBody}>
                        <AppText style={styles.commentUser} variant="label">
                          {reply.author}
                        </AppText>
                        <AppText style={styles.commentText} variant="body">
                          {reply.text}
                        </AppText>
                        <View style={styles.commentMetaRow}>
                          <AppText style={styles.commentMetaText} variant="caption">
                            {reply.timeAgo}
                          </AppText>
                          <Pressable
                            onPress={() => {
                              setReplyTarget({ commentId: item.id, author: item.author });
                              setDraftComment((prev) => {
                                const mention = `@${item.author} `;
                                if (prev.trim().startsWith(`@${item.author}`)) {
                                  return prev;
                                }
                                return `${mention}${prev}`.trimStart();
                              });
                            }}
                          >
                            <AppText style={styles.commentMetaText} variant="caption">
                              Reply
                            </AppText>
                          </Pressable>
                        </View>
                      </View>
                      <CommentLikeButton
                        count={Math.max(0, reply.likes + (commentLikesById[reply.id] ? 1 : 0))}
                        liked={Boolean(commentLikesById[reply.id])}
                        onPress={() => toggleCommentLike(reply.id)}
                      />
                    </View>
                  ))}
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.reactionBar}>
              {["😂", "🥰", "😅", "😳", "😉", "😎"].map((emoji) => (
                <Pressable key={emoji} onPress={() => setDraftComment((prev) => `${prev}${emoji}`)} style={styles.reactionChip}>
                  <AppText style={styles.reactionText} variant="body">
                    {emoji}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.composerShell}>
              {replyTarget ? (
                <View style={styles.replyBanner}>
                  <AppText style={styles.replyBannerText} variant="caption">
                    @{replyTarget.author} kişisine yanıt veriyorsun
                  </AppText>
                  <Pressable onPress={cancelReply}>
                    <Ionicons color="#9CA3AF" name="close" size={18} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.commentComposer}>
                <Avatar initials={composerInitials} size={34} uri={undefined} />
                <TextInput
                  onChangeText={setDraftComment}
                  placeholder="Add comment..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.commentInput}
                  value={draftComment}
                />
                <Pressable onPress={submitComment} style={styles.sendButton}>
                  <Ionicons color="#FFFFFF" name="arrow-up" size={18} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#151517",
    flex: 1,
  },
  safeAreaLight: {
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#151517",
  },
  containerLight: {
    backgroundColor: "#FFFFFF",
  },
  scopeOverlay: {
    alignSelf: "center",
    position: "absolute",
    top: theme.spacing.xl,
    zIndex: 10,
  },
  scopeSwitch: {
    backgroundColor: "rgba(21, 21, 23, 0.72)",
    borderRadius: 18,
    flexDirection: "row",
    gap: theme.spacing.lg,
    minHeight: 40,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  scopeSwitchOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  scopeButton: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  cityScopeWrap: {
    alignItems: "center",
    flexDirection: "row",
  },
  chevronButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  audienceMenuAnimated: {
    backgroundColor: "rgba(21, 21, 23, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    gap: 2,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  audienceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 30,
  },
  audienceText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "rgba(21, 21, 23, 0.72)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: theme.spacing.lg,
    top: theme.spacing.xl,
    width: 40,
    zIndex: 10,
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: "rgba(21, 21, 23, 0.72)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    left: theme.spacing.lg,
    position: "absolute",
    top: theme.spacing.xl,
    width: 40,
    zIndex: 10,
  },
  searchSafeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  searchProfileContainer: {
    backgroundColor: "#FFFFFF",
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  searchProfileScrollContent: {
    paddingVertical: theme.spacing.md,
  },
  searchProfileHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchProfileHeaderCenter: {
    flex: 1,
  },
  searchProfileHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  searchProfileBack: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  followButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
  },
  followButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  followButtonText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  followButtonTextActive: {
    color: "#FFFFFF",
  },
  searchProfileMoreButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 20,
  },
  profileMenuBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  profileMenuWrap: {
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  profileMenuSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  profileMenuItem: {
    alignItems: "center",
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
  },
  profileMenuItemText: {
    color: "#111827",
    fontSize: 18,
  },
  profileMenuItemTextDanger: {
    color: "#DC2626",
  },
  profileMenuCancel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: 72,
  },
  profileMenuCancelText: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "600",
  },
  searchProfileIdentity: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  searchProfileDisplayName: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  searchProfileUsername: {
    textAlign: "center",
  },
  searchProfileLocationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  searchProfileLocation: {
    textAlign: "center",
  },
  searchProfileBio: {
    color: theme.colors.textPrimary,
    maxWidth: 330,
    textAlign: "center",
  },
  searchProfileInstagramButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 58,
    width: "88%",
  },
  searchProfileInstagramText: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  searchProfilePrimaryActions: {
    alignSelf: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "88%",
  },
  searchProfilePrimaryActionButton: {
    flex: 1,
    height: 44,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  messageButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
  },
  messageButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  searchTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  searchInputWrap: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    color: "#0F172A",
    flex: 1,
    fontSize: 20,
    paddingVertical: 0,
  },
  searchCancel: {
    color: "#111827",
  },
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  searchHeaderTitle: {
    color: "#0F172A",
    fontSize: 22,
  },
  searchEmptyState: {
    alignItems: "center",
    paddingTop: theme.spacing.xl,
  },
  searchUserRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 64,
  },
  searchDismissButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  searchUserText: {
    flex: 1,
    gap: 2,
  },
  searchUsername: {
    color: "#111827",
    fontSize: 17,
  },
  searchMeta: {
    color: "#64748B",
    fontSize: 14,
  },
  searchEmptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  searchEmptyText: {
    color: "#94A3B8",
    textAlign: "center",
  },
  scopeLabel: {
    color: "rgba(255, 255, 255, 0.48)",
    fontSize: 17,
  },
  activeScopeLabel: {
    color: "#FFFFFF",
  },
  feedList: {
    flex: 1,
  },
  stateWrap: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  stateText: {
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
  },
  errorTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  retryText: {
    color: "#111827",
  },
  commentsBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "74%",
    minHeight: 380,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  commentsHandle: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.sm,
    width: 46,
  },
  commentsSearchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  commentsSearchLabel: {
    color: "#6B7280",
  },
  commentsSearchQuery: {
    color: "#2563EB",
    fontWeight: "700",
  },
  commentsHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  commentsTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  commentsClose: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  commentsList: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  commentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  threadBlock: {
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  replyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginLeft: 44,
    marginTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  replyAvatar: {
    backgroundColor: "#F1F5F9",
    height: 28,
    width: 28,
    borderRadius: 14,
  },
  commentAvatar: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  commentAvatarText: {
    color: "#334155",
    fontWeight: "700",
  },
  commentBody: {
    flex: 1,
    gap: 3,
  },
  commentUser: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  commentText: {
    color: theme.colors.textPrimary,
  },
  commentMetaRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  commentMetaText: {
    color: "#9CA3AF",
  },
  commentLikeWrap: {
    alignItems: "center",
    gap: 2,
    paddingTop: 2,
  },
  commentLikeCount: {
    color: "#9CA3AF",
  },
  commentLikeCountActive: {
    color: "#FF375F",
  },
  reactionBar: {
    borderTopColor: "#EEF2F7",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  reactionChip: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
  },
  reactionText: {
    fontSize: 24,
  },
  composerShell: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 20,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  replyBanner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xs,
  },
  replyBannerText: {
    color: "#64748B",
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  commentInput: {
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 0,
    color: theme.colors.textPrimary,
    flex: 1,
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: "transparent",
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
