import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, AppState, FlatList, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, useWindowDimensions, View, type ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useIsFocused, useNavigation, useRoute, type NavigationProp, type RouteProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "../../../components/ui/Avatar";
import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { AppText } from "../../../components/ui/AppText";
import { EventsRoutes, ExploreRoutes, MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAnimatedKeyboardHeight } from "../../../hooks/useAnimatedKeyboardHeight";
import { useAuth } from "../../../hooks/useAuth";
import type { ExploreStackParamList, MainTabParamList } from "../../../navigation/types";
import { ProfileContentTabs } from "../../profile/components/ProfileContentTabs";
import { ComplaintReasonSheet } from "../../profile/components/ComplaintReasonSheet";
import { ProfileAvatarRing } from "../../profile/components/ProfileAvatarRing";
import { ProfileStatsRow } from "../../profile/components/ProfileStatsRow";
import { getUserProfileStats, getUserPublicProfile, type UserProfileStats } from "../../profile/services/userProfile.service";
import { blockUser, getUserBlockStatus, unblockUser, type UserBlockStatus } from "../../profile/services/block.service";
import {
  followUser,
  getFollowButtonLabel,
  getFollowStatus,
  unfollowUser,
  type FollowStatus,
} from "../../profile/services/follow.service";
import {
  COMPLAINT_REASON_OPTIONS,
  createUserComplaint,
  createContentComplaint,
  type ComplaintReason,
} from "../../profile/services/complaints.service";
import { getOrCreateDirectConversation } from "../../messages/services/messages.service";
import { addSnapComment, getSnapComments, likeSnap, likeSnapComment, unlikeSnap, unlikeSnapComment } from "../../snaps/services/snaps.service";
import {
  addReelComment,
  getReelComments,
  likeReel,
  unlikeReel,
} from "../../profile/services/reelEngagement.service";
import type { ReelCommentItem } from "../../profile/types/reelEngagement";
import { buildExplorePostSharePayload } from "../../share/utils/buildSharePayloads";
import { useContentShareSheet } from "../../share/hooks/useContentShareSheet";
import { ExplorePostCard } from "../components/ExplorePostCard";
import { ExplorePostMoreSheet } from "../components/ExplorePostMoreSheet";
import type { AudienceMode } from "../services/audienceMode";
import { buildLoadExploreFeedInput, hasRequiredContext, reduceExploreViewState } from "../services/audienceMode";
import { loadExploreFeed } from "../services/explore.service";
import { searchUsers } from "../services/userSearch.service";
import { getExplorePostPlaybackKey, shouldExploreReelPlaybackActive } from "../utils/exploreReelPlayback";
import {
  resolveExplorePostComplaintTargetType,
  shouldShowExplorePostMoreAction,
  isExplorePostReportedHidden,
  markExplorePostReported,
} from "../utils/exploreContentComplaint";
import { resolveExploreReelEventNavigationTarget } from "../utils/exploreReelEventNavigation";
import { formatProfileLocation } from "../../../utils/formatProfileLocation";
import type { ExploreFeedScope, ExplorePost, SnapCommentItem } from "../types";

type ExploreSearchUser = {
  id: string;
  username: string;
  displayName: string;
  countryCode: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
  accountType?: "personal" | "business";
  isFollowing?: boolean;
  hasNewPosts?: boolean;
  isOrganizer?: boolean;
  verificationBadge?: "organizer" | "business";
};

type CommentReplyTarget = {
  commentId: string;
  authorUsername: string;
};

const countSnapComments = (items: SnapCommentItem[]): number =>
  items.reduce((sum, item) => sum + 1 + countSnapComments(item.replies ?? []), 0);

const syncCommentLikes = (items: SnapCommentItem[]): Record<string, { liked: boolean; count: number }> => {
  const acc: Record<string, { liked: boolean; count: number }> = {};
  const walk = (list: SnapCommentItem[]) => {
    list.forEach((item) => {
      acc[item.id] = {
        liked: item.viewerState.liked,
        count: item.stats.likeCount,
      };
      walk(item.replies ?? []);
    });
  };
  walk(items);
  return acc;
};

export function ExploreFeedScreen() {
  const { user } = useAuth();
  const { openShare, isShareVisible, contentShareSheet } = useContentShareSheet();
  const isScreenFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp<ExploreStackParamList>>();
  const route = useRoute<RouteProp<ExploreStackParamList, "ExploreFeedScreen">>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible, animatedHeight: keyboardPadding } = useAnimatedKeyboardHeight({
    contentBottomOffset: 0,
    extraOffset: theme.spacing.xs,
  });
  const sheetBottomPadding = Math.max(insets.bottom, theme.spacing.lg);
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
  const [snapComments, setSnapComments] = useState<SnapCommentItem[]>([]);
  const [reelComments, setReelComments] = useState<ReelCommentItem[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [postLikesById, setPostLikesById] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [postCommentCountsById, setPostCommentCountsById] = useState<Record<string, number>>({});
  const [followStatusByAuthorId, setFollowStatusByAuthorId] = useState<Record<string, FollowStatus>>({});
  const [followLoadingByAuthorId, setFollowLoadingByAuthorId] = useState<Record<string, boolean>>({});
  const [commentLikesById, setCommentLikesById] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [commentLikeLoadingId, setCommentLikeLoadingId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentReplyTarget | null>(null);
  const [isLikeActionLoading, setIsLikeActionLoading] = useState<string | null>(null);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [draftComment, setDraftComment] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExploreSearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchUsersError, setSearchUsersError] = useState<string | null>(null);
  const [isAudienceMenuOpen, setIsAudienceMenuOpen] = useState(false);
  const [feedViewportHeight, setFeedViewportHeight] = useState(0);
  const [dismissedSearchUserIds, setDismissedSearchUserIds] = useState<string[]>([]);
  const [selectedSearchUser, setSelectedSearchUser] = useState<ExploreSearchUser | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ComplaintReason | null>(null);
  const [reportingPost, setReportingPost] = useState<ExplorePost | null>(null);
  const [moreMenuPost, setMoreMenuPost] = useState<ExplorePost | null>(null);
  const [reportedPostKeys, setReportedPostKeys] = useState<Set<string>>(() => new Set());
  const [isContentReportSubmitting, setIsContentReportSubmitting] = useState(false);
  const [profileBlockStatus, setProfileBlockStatus] = useState<UserBlockStatus | null>(null);
  const [isProfileActionLoading, setIsProfileActionLoading] = useState(false);
  const [profileContentRefreshToken, setProfileContentRefreshToken] = useState(0);
  const [profileStats, setProfileStats] = useState<UserProfileStats | null>(null);
  const [activeVisiblePostKey, setActiveVisiblePostKey] = useState<string | null>(null);
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState === "active");
  const audienceAnim = useRef(new Animated.Value(0)).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextVisiblePost = viewableItems.find((entry) => entry.isViewable && typeof entry.key === "string");
    setActiveVisiblePostKey(nextVisiblePost?.key ?? null);
  }).current;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const playbackOverlayState = useMemo(
    () => ({
      isSearchOpen,
      isSearchProfileOpen: Boolean(selectedSearchUser),
      isCommentsOpen: Boolean(activeCommentsPost),
      isShareOpen: isShareVisible,
      isMoreMenuOpen: Boolean(moreMenuPost),
      isContentReportOpen: Boolean(reportingPost),
      isProfileMenuOpen: Boolean(selectedSearchUser) && isProfileMenuOpen,
      isProfileReportOpen: Boolean(selectedSearchUser) && isReportModalOpen,
    }),
    [
      activeCommentsPost,
      isProfileMenuOpen,
      isReportModalOpen,
      isSearchOpen,
      isShareVisible,
      moreMenuPost,
      reportingPost,
      selectedSearchUser,
    ],
  );

  const resolvePostPlaybackActive = useCallback(
    (post: ExplorePost) => {
      const isPostReportedHidden = isExplorePostReportedHidden(reportedPostKeys, post);

      return shouldExploreReelPlaybackActive({
        isScreenFocused,
        isAppActive,
        activeVisiblePostKey,
        postKey: getExplorePostPlaybackKey(post),
        isPostReportedHidden,
        ...playbackOverlayState,
      });
    },
    [activeVisiblePostKey, isAppActive, isScreenFocused, playbackOverlayState, reportedPostKeys],
  );

  useFocusEffect(
    useCallback(() => {
      setProfileContentRefreshToken((value) => value + 1);
    }, []),
  );

  useEffect(() => {
    if (!selectedSearchUser?.id) {
      setProfileBlockStatus(null);
      setFollowStatus(null);
      setProfileStats(null);
      return;
    }

    void (async () => {
      try {
        const [blockStatus, nextFollowStatus, publicProfile, stats] = await Promise.all([
          getUserBlockStatus(selectedSearchUser.id),
          getFollowStatus(selectedSearchUser.id),
          getUserPublicProfile(selectedSearchUser.id),
          getUserProfileStats(selectedSearchUser.id),
        ]);
        setProfileBlockStatus(blockStatus);
        setFollowStatus(nextFollowStatus);
        setProfileStats(stats);
        setSelectedSearchUser((current) =>
          current?.id === selectedSearchUser.id
            ? {
                ...current,
                username: publicProfile.username || current.username,
                displayName: publicProfile.displayName || current.displayName,
                avatarUrl: publicProfile.avatarUrl ?? current.avatarUrl,
                bio: publicProfile.bio ?? current.bio,
                city: publicProfile.city ?? current.city,
                countryCode: publicProfile.countryCode ?? current.countryCode,
                accountType: publicProfile.accountType,
                isOrganizer: publicProfile.isOrganizer,
                verificationBadge: publicProfile.verificationBadge,
              }
            : current,
        );
      } catch {
        setProfileBlockStatus(null);
        setFollowStatus(null);
        setProfileStats(null);
      }
    })();
  }, [selectedSearchUser?.id]);

  useEffect(() => {
    const tabNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
    if (!tabNavigation) {
      return;
    }

    const unsubscribe = tabNavigation.addListener("tabPress", () => {
      if (!navigation.isFocused()) {
        return;
      }
      setSelectedSearchUser(null);
      setIsProfileMenuOpen(false);
      setIsReportModalOpen(false);
      setIsSearchOpen(false);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const openUser = route.params?.openUser;
    if (!openUser) {
      return;
    }

    setSelectedSearchUser({
      id: openUser.id,
      username: openUser.username,
      displayName: openUser.displayName,
      avatarUrl: openUser.avatarUrl,
      countryCode: "",
      isOrganizer: openUser.isOrganizer ?? false,
    });
    navigation.setParams({ openUser: undefined });
  }, [navigation, route.params?.openUser]);

  const openSearchUserProfile = (searchUser: ExploreSearchUser) => {
    setIsSearchOpen(false);
    // Avoid modal stacking race: open profile after search modal fully starts closing.
    setTimeout(() => {
      setSelectedSearchUser(searchUser);
    }, 120);
  };
  const toggleFollowUser = () => {
    if (!selectedSearchUser || isFollowActionLoading || profileBlockStatus?.isBlocked) {
      return;
    }

    void (async () => {
      setIsFollowActionLoading(true);
      try {
        if (followStatus?.iFollow) {
          await unfollowUser(selectedSearchUser.id);
        } else {
          await followUser(selectedSearchUser.id);
        }
        const nextStatus = await getFollowStatus(selectedSearchUser.id);
        setFollowStatus(nextStatus);
      } catch (err) {
        Alert.alert("Hata", err instanceof Error ? err.message : "Takip işlemi tamamlanamadı.");
      } finally {
        setIsFollowActionLoading(false);
      }
    })();
  };
  const openDirectMessage = async (targetUser: ExploreSearchUser) => {
    if (!user?.id) {
      return;
    }
    if (profileBlockStatus?.isBlocked) {
      Alert.alert(
        "Mesaj gönderilemiyor",
        profileBlockStatus.blockedByMe
          ? "Bu kullanıcıyı engellediniz."
          : "Bu kullanıcıyla mesajlaşamazsın.",
      );
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
    } catch (err) {
      Alert.alert("Mesaj gönderilemiyor", err instanceof Error ? err.message : "Bu kullanıcıyla mesajlaşamazsın.");
    }
  };

  const onToggleBlockUser = async () => {
    if (!selectedSearchUser || isProfileActionLoading) {
      return;
    }

    setIsProfileActionLoading(true);
    try {
      if (profileBlockStatus?.blockedByMe) {
        await unblockUser(selectedSearchUser.id);
        setProfileBlockStatus({ blockedByMe: false, blockedMe: false, isBlocked: false });
        Alert.alert("Engel kaldırıldı", `${selectedSearchUser.displayName} kullanıcısının engeli kaldırıldı.`);
      } else {
        await blockUser(selectedSearchUser.id);
        setProfileBlockStatus({ blockedByMe: true, blockedMe: false, isBlocked: true });
        setFollowStatus({ iFollow: false, followsMe: false, isFriend: false });
        Alert.alert("Engellendi", `${selectedSearchUser.displayName} kullanıcısını engellediniz.`);
      }
      setIsProfileMenuOpen(false);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    } finally {
      setIsProfileActionLoading(false);
    }
  };

  const onSubmitReport = async () => {
    if (!selectedSearchUser || !selectedReportReason || isProfileActionLoading) {
      return;
    }

    setIsProfileActionLoading(true);
    try {
      await createUserComplaint({
        targetUserId: selectedSearchUser.id,
        reason: selectedReportReason,
      });
      setIsReportModalOpen(false);
      setSelectedReportReason(null);
      setIsProfileMenuOpen(false);
      Alert.alert("Şikayet alındı", "Şikayetiniz incelenmek üzere kaydedildi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şikayet gönderilemedi.");
    } finally {
      setIsProfileActionLoading(false);
    }
  };

  const submitContentReport = async (reason: ComplaintReason) => {
    if (!reportingPost || isContentReportSubmitting) {
      return;
    }

    setIsContentReportSubmitting(true);
    const reportedPost = reportingPost;
    try {
      await createContentComplaint({
        targetType: resolveExplorePostComplaintTargetType(reportedPost.type),
        targetId: reportedPost.id,
        reason,
      });
      setReportedPostKeys((current) => markExplorePostReported(current, reportedPost));
      setReportingPost(null);
      setMoreMenuPost(null);
      Alert.alert("Teşekkürler", "Geri bildirimin kaydedildi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şikayet gönderilemedi.");
    } finally {
      setIsContentReportSubmitting(false);
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
    () => searchResults.filter((item) => !dismissedSearchUserIds.includes(item.id)),
    [dismissedSearchUserIds, searchResults],
  );
  const selectedProfileLocation = useMemo(
    () => formatProfileLocation(selectedSearchUser?.city, selectedSearchUser?.countryCode),
    [selectedSearchUser?.city, selectedSearchUser?.countryCode],
  );
  const selectedProfileIsOrganizer = Boolean(
    selectedSearchUser &&
      (selectedSearchUser.id === user?.id
        ? user?.organizerStatus === "approved"
        : selectedSearchUser.isOrganizer),
  );
  const isApprovedOrganizerUser = user?.organizerStatus === "approved";

  const openExploreShare = useCallback(() => {
    if (isApprovedOrganizerUser) {
      navigation.navigate(ExploreRoutes.CreateReelScreen);
      return;
    }
    navigation.navigate(ExploreRoutes.ExploreCameraScreen);
  }, [isApprovedOrganizerUser, navigation]);

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
              accountType: item.accountType,
              isOrganizer: item.isOrganizer,
              verificationBadge: item.verificationBadge,
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
          }),
          scope,
        );
        setPosts(result);
        setError(null);
        setPostCommentCountsById(
          result.reduce<Record<string, number>>((acc, post) => {
            acc[post.id] = post.stats.commentCount;
            return acc;
          }, {}),
        );
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

  const loadCommentsForPost = useCallback(async (post: ExplorePost) => {
    setIsCommentsLoading(true);
    setCommentsError(null);
    try {
      if (post.type === "reel") {
        const comments = await getReelComments(post.id);
        setReelComments(comments);
        setSnapComments([]);
        setCommentLikesById({});
      } else {
        const comments = await getSnapComments(post.id);
        setSnapComments(comments);
        setReelComments([]);
        setCommentLikesById(syncCommentLikes(comments));
      }
    } catch (err) {
      setSnapComments([]);
      setReelComments([]);
      setCommentLikesById({});
      setCommentsError(err instanceof Error ? err.message : "Yorumlar yüklenemedi.");
    } finally {
      setIsCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeCommentsPost) {
      setSnapComments([]);
      setReelComments([]);
      setCommentLikesById({});
      setCommentsError(null);
      setReplyTarget(null);
      return;
    }
    void loadCommentsForPost(activeCommentsPost);
  }, [activeCommentsPost, loadCommentsForPost]);

  useEffect(() => {
    if (posts.length === 0 || !user?.id) {
      setFollowStatusByAuthorId({});
      return;
    }

    const authorIds = [...new Set(posts.map((post) => post.author.id).filter((authorId) => authorId !== user.id))];
    if (authorIds.length === 0) {
      setFollowStatusByAuthorId({});
      return;
    }

    void (async () => {
      const entries = await Promise.all(
        authorIds.map(async (authorId) => {
          try {
            const status = await getFollowStatus(authorId);
            return [authorId, status] as const;
          } catch {
            return null;
          }
        }),
      );
      setFollowStatusByAuthorId(
        entries.reduce<Record<string, FollowStatus>>((acc, entry) => {
          if (entry) {
            acc[entry[0]] = entry[1];
          }
          return acc;
        }, {}),
      );
    })();
  }, [posts, user?.id]);

  useEffect(() => {
    void fetchFeed("initial");
  }, [fetchFeed]);

  useEffect(() => {
    if (posts.length === 0) {
      setPostLikesById({});
      return;
    }
    setPostLikesById(
      posts.reduce<Record<string, { liked: boolean; count: number }>>((acc, post) => {
        acc[post.id] = {
          liked: Boolean(post.viewerState.liked),
          count: post.stats.likeCount,
        };
        return acc;
      }, {}),
    );
  }, [posts]);

  const openPostAuthorProfile = (post: ExplorePost) => {
    setSelectedSearchUser({
      id: post.author.id,
      username: post.author.username || post.author.displayName,
      displayName: post.author.displayName,
      countryCode: "",
      avatarUrl: post.author.avatarUrl,
      bio: post.text || `${post.author.displayName} Tourist topluluğunda Snap paylaşıyor.`,
      accountType: post.author.accountType,
      isOrganizer: post.author.isOrganizer ?? false,
      verificationBadge: post.author.verificationBadge,
    });
  };

  const openExploreActiveEvent = useCallback(
    (eventId: string) => {
      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.EventsTab, {
        screen: EventsRoutes.EventDetailScreen,
        params: { eventId },
      });
    },
    [navigation],
  );

  const openExplorePastEvent = useCallback(
    (eventId: string) => {
      const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>();
      tabNavigation?.navigate(TabRoutes.EventsTab, {
        screen: EventsRoutes.EventAlbumScreen,
        params: { eventId },
      });
    },
    [navigation],
  );

  const openExploreReelEvent = useCallback(
    (event: NonNullable<ExplorePost["event"]>) => {
      const target = resolveExploreReelEventNavigationTarget(event.status);

      if (target === "detail") {
        openExploreActiveEvent(event.id);
        return;
      }

      if (target === "album") {
        openExplorePastEvent(event.id);
      }
    },
    [openExploreActiveEvent, openExplorePastEvent],
  );

  const toggleFollowOnAuthor = (authorId: string) => {
    if (followLoadingByAuthorId[authorId]) {
      return;
    }

    void (async () => {
      setFollowLoadingByAuthorId((prev) => ({ ...prev, [authorId]: true }));
      try {
        const current = followStatusByAuthorId[authorId];
        if (current?.iFollow) {
          await unfollowUser(authorId);
        } else {
          await followUser(authorId);
        }
        const nextStatus = await getFollowStatus(authorId);
        setFollowStatusByAuthorId((prev) => ({ ...prev, [authorId]: nextStatus }));
      } catch (err) {
        Alert.alert("Hata", err instanceof Error ? err.message : "Takip işlemi tamamlanamadı.");
      } finally {
        setFollowLoadingByAuthorId((prev) => ({ ...prev, [authorId]: false }));
      }
    })();
  };

  const togglePostLike = (post: ExplorePost) => {
    if (isLikeActionLoading === post.id) {
      return;
    }

    const current = postLikesById[post.id] ?? {
      liked: Boolean(post.viewerState.liked),
      count: post.stats.likeCount,
    };

    void (async () => {
      setIsLikeActionLoading(post.id);
      try {
        const result =
          post.type === "reel"
            ? current.liked
              ? await unlikeReel(post.id)
              : await likeReel(post.id)
            : current.liked
              ? await unlikeSnap(post.id)
              : await likeSnap(post.id);
        setPostLikesById((prev) => ({
          ...prev,
          [post.id]: {
            liked: result.liked,
            count: result.likeCount,
          },
        }));
      } catch (err) {
        Alert.alert("Hata", err instanceof Error ? err.message : "Beğeni işlemi tamamlanamadı.");
      } finally {
        setIsLikeActionLoading(null);
      }
    })();
  };

  const toggleCommentLike = (commentId: string) => {
    if (!activeCommentsPost || commentLikeLoadingId === commentId) {
      return;
    }

    const current = commentLikesById[commentId] ?? { liked: false, count: 0 };

    void (async () => {
      setCommentLikeLoadingId(commentId);
      try {
        const result = current.liked
          ? await unlikeSnapComment(activeCommentsPost.id, commentId)
          : await likeSnapComment(activeCommentsPost.id, commentId);
        setCommentLikesById((prev) => ({
          ...prev,
          [commentId]: {
            liked: result.liked,
            count: result.likeCount,
          },
        }));
      } catch (err) {
        Alert.alert("Hata", err instanceof Error ? err.message : "Beğeni işlemi tamamlanamadı.");
      } finally {
        setCommentLikeLoadingId(null);
      }
    })();
  };

  const startReply = (comment: SnapCommentItem) => {
    const username = comment.author.username || comment.author.displayName;
    setReplyTarget({ commentId: comment.id, authorUsername: username });
    setDraftComment(`@${username} `);
  };

  const submitComment = () => {
    if (!activeCommentsPost || isCommentSubmitting) {
      return;
    }
    const clean = draftComment.trim();
    if (!clean) {
      return;
    }

    const parentCommentId = replyTarget?.commentId;

    void (async () => {
      setIsCommentSubmitting(true);
      try {
        if (activeCommentsPost.type === "reel") {
          const comments = await addReelComment(activeCommentsPost.id, clean);
          setReelComments(comments);
          setPostCommentCountsById((prev) => ({
            ...prev,
            [activeCommentsPost.id]: comments.length,
          }));
        } else {
          await addSnapComment(activeCommentsPost.id, clean, parentCommentId);
          if (parentCommentId) {
            await loadCommentsForPost(activeCommentsPost);
          } else {
            const comments = await getSnapComments(activeCommentsPost.id);
            setSnapComments(comments);
            setCommentLikesById(syncCommentLikes(comments));
          }
          setPostCommentCountsById((prev) => ({
            ...prev,
            [activeCommentsPost.id]: (prev[activeCommentsPost.id] ?? activeCommentsPost.stats.commentCount) + 1,
          }));
        }
        setDraftComment("");
        setReplyTarget(null);
      } catch (err) {
        Alert.alert("Hata", err instanceof Error ? err.message : "Yorum gönderilemedi.");
      } finally {
        setIsCommentSubmitting(false);
      }
    })();
  };

  const formatCommentTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
  };

  const composerInitials = (user?.publicProfile?.displayName || "TM").slice(0, 2).toUpperCase();
  const totalCommentCount =
    activeCommentsPost?.type === "reel" ? reelComments.length : countSnapComments(snapComments);

  const renderCommentItem = (item: SnapCommentItem, isReply = false) => {
    const likeState = commentLikesById[item.id] ?? {
      liked: item.viewerState.liked,
      count: item.stats.likeCount,
    };

    return (
      <View key={item.id}>
        <View style={isReply ? styles.replyRow : styles.commentRow}>
          <View style={[styles.commentAvatar, isReply && styles.replyAvatar]}>
            <AppText style={styles.commentAvatarText} variant="caption">
              {item.author.displayName.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.commentBody}>
            <VerifiedNameRow
              accountType={item.author.accountType}
              badgeSize={14}
              isOrganizer={item.author.isOrganizer}
              name={item.author.displayName}
              style={styles.commentUserRow}
              textStyle={styles.commentUser}
              verificationBadge={item.author.verificationBadge}
            />
            <AppText style={styles.commentText} variant="body">
              {item.text}
            </AppText>
            <View style={styles.commentMetaRow}>
              <AppText style={styles.commentMetaText} variant="caption">
                {formatCommentTime(item.createdAt)}
              </AppText>
              <Pressable onPress={() => startReply(item)}>
                <AppText style={styles.commentMetaText} variant="caption">
                  Yanıtla
                </AppText>
              </Pressable>
            </View>
          </View>
          <Pressable
            disabled={commentLikeLoadingId === item.id}
            onPress={() => toggleCommentLike(item.id)}
            style={styles.commentLikeWrap}
          >
            <Ionicons color={likeState.liked ? "#FF375F" : "#9CA3AF"} name={likeState.liked ? "heart" : "heart-outline"} size={16} />
            {likeState.count > 0 ? (
              <AppText
                style={[styles.commentLikeCount, likeState.liked && styles.commentLikeCountActive]}
                variant="caption"
              >
                {likeState.count}
              </AppText>
            ) : null}
          </Pressable>
        </View>
        {(item.replies ?? []).map((reply) => renderCommentItem(reply, true))}
      </View>
    );
  };

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
            Henüz snap yok
          </AppText>
          <AppText style={styles.stateText} variant="bodyMuted">
            {scope === "city" ? "Ülke filtresini dene veya ilk Snap'i sen paylaş." : "Yakında yeni Snap'ler burada görünecek."}
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
        keyExtractor={(item) => `${item.type}:${item.id}`}
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0 && nextHeight !== feedViewportHeight) {
            setFeedViewportHeight(nextHeight);
          }
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        onRefresh={() => void fetchFeed("refresh")}
        pagingEnabled
        refreshing={refreshing}
        renderItem={({ item }) => {
          const isPostReportedHidden = isExplorePostReportedHidden(reportedPostKeys, item);

          return (
          <ExplorePostCard
            authorFollowStatus={followStatusByAuthorId[item.author.id] ?? null}
            commentCount={postCommentCountsById[item.id] ?? item.stats.commentCount}
            height={feedViewportHeight > 0 ? feedViewportHeight : height}
            isFollowLoading={Boolean(followLoadingByAuthorId[item.author.id])}
            isLiked={postLikesById[item.id]?.liked ?? item.viewerState.liked}
            isPlaybackActive={resolvePostPlaybackActive(item)}
            isReportedHidden={isPostReportedHidden}
            likeCount={postLikesById[item.id]?.count ?? item.stats.likeCount}
            onAuthorPress={() => openPostAuthorProfile(item)}
            onCommentPress={() => {
              setActiveCommentsPost(item);
              setDraftComment("");
              setReplyTarget(null);
            }}
            onFollowPress={() => toggleFollowOnAuthor(item.author.id)}
            onLikePress={() => togglePostLike(item)}
            onEventPress={
              item.event ? () => openExploreReelEvent(item.event!) : undefined
            }
            onMorePress={
              shouldShowExplorePostMoreAction(user?.id, item.author.id, isPostReportedHidden)
                ? () => setMoreMenuPost(item)
                : undefined
            }
            onSharePress={() => openShare(buildExplorePostSharePayload(item))}
            post={item}
            viewerId={user?.id}
          />
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.feedList}
        viewabilityConfig={viewabilityConfig}
      />
    );
  };

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
                <VerifiedNameRow
                  accountType={selectedSearchUser.accountType}
                  badgeSize={20}
                  isOrganizer={selectedProfileIsOrganizer}
                  name={selectedSearchUser.displayName}
                  style={styles.searchProfileDisplayNameRow}
                  textStyle={styles.searchProfileDisplayName}
                  verificationBadge={selectedSearchUser.verificationBadge}
                />
                <AppText muted style={styles.searchProfileUsername} variant="bodyMuted">
                  @{selectedSearchUser.username}
                </AppText>
                {profileBlockStatus?.isBlocked ? (
                  <View style={styles.searchProfileRestricted}>
                    <Ionicons color={theme.colors.textSecondary} name="eye-off-outline" size={28} />
                    <AppText style={styles.searchProfileRestrictedTitle} variant="label">
                      {profileBlockStatus.blockedByMe ? "Bu kullanıcıyı engellediniz" : "Profil görüntülenemiyor"}
                    </AppText>
                    <AppText style={styles.searchProfileRestrictedText} variant="bodyMuted">
                      {profileBlockStatus.blockedByMe
                        ? "Engeli kaldırmak için menüden Engeli Kaldır seçeneğini kullanabilirsin."
                        : "Bu kullanıcıyla etkileşim kuramazsın."}
                    </AppText>
                  </View>
                ) : (
                  <>
                    {selectedProfileLocation ? (
                      <View style={styles.searchProfileLocationRow}>
                        <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
                        <AppText style={styles.searchProfileLocation} variant="bodyMuted">
                          {selectedProfileLocation}
                        </AppText>
                      </View>
                    ) : null}
                    <AppText style={styles.searchProfileBio} variant="body">
                      {selectedSearchUser.bio ?? `${selectedSearchUser.displayName} is part of the Tourist community.`}
                    </AppText>
                  </>
                )}
              </View>

              {!profileBlockStatus?.isBlocked ? (
                <>
                  <ProfileStatsRow
                    events={profileStats?.events}
                    helped={profileStats?.helped}
                    organized={profileStats?.organized}
                    showOrganized={selectedProfileIsOrganizer}
                  />

                  <Pressable style={styles.searchProfileInstagramButton}>
                    <Ionicons color={theme.colors.textPrimary} name="logo-instagram" size={22} />
                    <AppText style={styles.searchProfileInstagramText} variant="label">
                      Instagram Profile
                    </AppText>
                  </Pressable>
                  <View style={styles.searchProfilePrimaryActions}>
                    <Pressable
                      disabled={isFollowActionLoading}
                      onPress={toggleFollowUser}
                      style={[
                        styles.followButton,
                        styles.searchProfilePrimaryActionButton,
                        followStatus?.iFollow && styles.followButtonActive,
                        followStatus?.isFriend && styles.followButtonFriend,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.followButtonText,
                          followStatus?.iFollow && styles.followButtonTextActive,
                          followStatus?.isFriend && styles.followButtonTextFriend,
                        ]}
                        variant="caption"
                      >
                        {isFollowActionLoading
                          ? "..."
                          : followStatus
                            ? getFollowButtonLabel(followStatus)
                            : "Takip Et"}
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

                  <ProfileContentTabs
                    isOrganizer={selectedProfileIsOrganizer}
                    isOwnProfile={selectedSearchUser.id === user?.id}
                    onActiveEventPress={openExploreActiveEvent}
                    onEventPress={openExploreActiveEvent}
                    onMemberEventPress={openExplorePastEvent}
                    onPastEventPress={openExplorePastEvent}
                    organizerDisplayName={selectedSearchUser.displayName}
                    refreshToken={profileContentRefreshToken}
                    userId={selectedSearchUser.id}
                  />
                </>
              ) : null}
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
            <Pressable
              accessibilityLabel={isApprovedOrganizerUser ? "Tanıtım ekle" : "Snap oluştur"}
              onPress={openExploreShare}
              style={styles.cameraButton}
            >
              <Ionicons
                color="#FFFFFF"
                name={isApprovedOrganizerUser ? "add" : "camera-outline"}
                size={isApprovedOrganizerUser ? 24 : 20}
              />
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
                    <VerifiedNameRow
                      accountType={item.accountType}
                      badgeSize={14}
                      isOrganizer={item.isOrganizer}
                      name={item.username}
                      style={styles.searchUsernameRow}
                      textStyle={styles.searchUsername}
                      verificationBadge={item.verificationBadge}
                    />
                    <AppText style={styles.searchMeta} variant="caption">
                      {item.displayName}
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
              <Pressable
                onPress={() => {
                  setIsProfileMenuOpen(false);
                  setSelectedReportReason(null);
                  setIsReportModalOpen(true);
                }}
                style={styles.profileMenuItem}
              >
                <AppText style={[styles.profileMenuItemText, styles.profileMenuItemTextDanger]} variant="body">
                  Şikayet Et
                </AppText>
              </Pressable>
              <Pressable disabled={isProfileActionLoading} onPress={() => void onToggleBlockUser()} style={styles.profileMenuItem}>
                <AppText style={styles.profileMenuItemText} variant="body">
                  {profileBlockStatus?.blockedByMe ? "Engeli Kaldır" : "Engelle"}
                </AppText>
              </Pressable>
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
          setIsReportModalOpen(false);
          setSelectedReportReason(null);
        }}
        transparent
        visible={Boolean(selectedSearchUser) && isReportModalOpen}
      >
        <Pressable
          onPress={() => {
            setIsReportModalOpen(false);
            setSelectedReportReason(null);
          }}
          style={styles.profileMenuBackdrop}
        >
          <View style={styles.profileMenuWrap}>
            <Pressable style={styles.profileMenuSheet}>
              <AppText style={styles.reportModalTitle} variant="label">
                Şikayet sebebi
              </AppText>
              {COMPLAINT_REASON_OPTIONS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setSelectedReportReason(item.value)}
                  style={styles.profileMenuItem}
                >
                  <AppText
                    style={[
                      styles.profileMenuItemText,
                      selectedReportReason === item.value && styles.reportReasonSelected,
                    ]}
                    variant="body"
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
              <Pressable
                disabled={!selectedReportReason || isProfileActionLoading}
                onPress={() => void onSubmitReport()}
                style={[styles.reportSubmitButton, !selectedReportReason && styles.reportSubmitButtonDisabled]}
              >
                <AppText style={styles.reportSubmitButtonText} variant="label">
                  {isProfileActionLoading ? "Gönderiliyor..." : "Şikayeti Gönder"}
                </AppText>
              </Pressable>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsReportModalOpen(false);
                setSelectedReportReason(null);
              }}
              style={styles.profileMenuCancel}
            >
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
          setDraftComment("");
          setReplyTarget(null);
        }}
        transparent
        visible={Boolean(activeCommentsPost)}
      >
        <Pressable
          onPress={() => {
            setActiveCommentsPost(null);
            setDraftComment("");
            setReplyTarget(null);
          }}
          style={styles.commentsBackdrop}
        >
          <Pressable onPress={() => undefined} style={styles.commentsSheetPressable}>
            <View
              style={[
                styles.commentsSheet,
                !isKeyboardVisible ? { paddingBottom: sheetBottomPadding } : null,
              ]}
            >
              <View style={styles.commentsSheetBody}>
                <View style={styles.commentsHandle} />
                <View style={styles.commentsHeaderRow}>
                  <AppText style={styles.commentsTitle} variant="sectionTitle">
                    {totalCommentCount} yorum
                  </AppText>
                  <Pressable
                    onPress={() => {
                      setActiveCommentsPost(null);
                      setDraftComment("");
                      setReplyTarget(null);
                    }}
                    style={styles.commentsClose}
                  >
                    <Ionicons color="#111827" name="close" size={20} />
                  </Pressable>
                </View>
                {isCommentsLoading ? (
                  <View style={styles.commentsLoadingWrap}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                ) : commentsError ? (
                  <View style={styles.commentsLoadingWrap}>
                    <AppText variant="bodyMuted">{commentsError}</AppText>
                  </View>
                ) : activeCommentsPost?.type === "reel" ? (
                  <FlatList
                    contentContainerStyle={styles.commentsList}
                    data={reelComments}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      <AppText style={styles.commentsEmpty} variant="bodyMuted">
                        Henüz yorum yok. İlk yorumu sen yaz.
                      </AppText>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.commentRow}>
                        <AppText style={styles.commentUser} variant="label">
                          @{item.author.username || item.author.displayName}
                        </AppText>
                        <AppText style={styles.commentText} variant="body">
                          {item.text}
                        </AppText>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <FlatList
                    contentContainerStyle={styles.commentsList}
                    data={snapComments}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      <AppText style={styles.commentsEmpty} variant="bodyMuted">
                        Henüz yorum yok. İlk yorumu sen yaz.
                      </AppText>
                    }
                    renderItem={({ item }) => <View style={styles.threadBlock}>{renderCommentItem(item)}</View>}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>

              <View style={styles.composerDock}>
                {replyTarget && activeCommentsPost?.type !== "reel" ? (
                  <View style={styles.replyBanner}>
                    <AppText style={styles.replyBannerText} variant="caption">
                      @{replyTarget.authorUsername} yanıtlanıyor
                    </AppText>
                    <Pressable
                      onPress={() => {
                        setReplyTarget(null);
                        setDraftComment("");
                      }}
                    >
                      <Ionicons color="#64748B" name="close" size={16} />
                    </Pressable>
                  </View>
                ) : null}
                <View style={styles.commentComposer}>
                  <Avatar initials={composerInitials} size={34} uri={undefined} />
                  <TextInput
                    editable={!isCommentSubmitting}
                    onChangeText={setDraftComment}
                    placeholder="Yorum ekle..."
                    placeholderTextColor={theme.colors.muted}
                    style={styles.commentInput}
                    value={draftComment}
                  />
                  <Pressable disabled={isCommentSubmitting} onPress={submitComment} style={styles.sendButton}>
                    <Ionicons color="#FFFFFF" name="arrow-up" size={18} />
                  </Pressable>
                </View>
                <Animated.View style={[styles.keyboardFill, { height: keyboardPadding }]} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ExplorePostMoreSheet
        onClose={() => setMoreMenuPost(null)}
        onReportPress={() => {
          if (!moreMenuPost) {
            return;
          }
          setReportingPost(moreMenuPost);
          setMoreMenuPost(null);
        }}
        visible={moreMenuPost != null}
      />
      <ComplaintReasonSheet
        isSubmitting={isContentReportSubmitting}
        onClose={() => setReportingPost(null)}
        onSubmit={submitContentReport}
        visible={reportingPost != null}
      />
      {contentShareSheet}
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
  followButtonFriend: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  followButtonTextFriend: {
    color: "#047857",
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
  searchProfileRestricted: {
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  searchProfileRestrictedTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  searchProfileRestrictedText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  reportModalTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    textTransform: "uppercase",
  },
  reportReasonSelected: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  reportSubmitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    minHeight: 48,
  },
  reportSubmitButtonDisabled: {
    opacity: 0.45,
  },
  reportSubmitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  searchProfileIdentity: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  searchProfileDisplayName: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  searchProfileDisplayNameRow: {
    justifyContent: "center",
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
    fontWeight: "600",
  },
  searchUsernameRow: {
    maxWidth: "100%",
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
  commentsSheetPressable: {
    width: "100%",
  },
  commentsSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "74%",
    minHeight: 380,
    overflow: "hidden",
  },
  commentsSheetBody: {
    flex: 1,
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
  commentsLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    paddingVertical: theme.spacing.lg,
  },
  commentsEmpty: {
    paddingVertical: theme.spacing.lg,
    textAlign: "center",
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
    fontWeight: "600",
  },
  commentUserRow: {
    maxWidth: "100%",
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
  composerDock: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  keyboardFill: {
    backgroundColor: "#FFFFFF",
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
