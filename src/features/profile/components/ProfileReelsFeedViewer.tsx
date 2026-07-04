import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MediaCarousel } from "../../../components/media/MediaCarousel";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { ComplaintReasonSheet } from "./ComplaintReasonSheet";
import { createContentComplaint, type ComplaintReason } from "../services/complaints.service";
import { deleteOrganizerReel } from "../services/reels.service";
import type { ReelItem } from "../types/reels";

type ProfileReelsFeedViewerProps = {
  visible: boolean;
  reels: ReelItem[];
  initialIndex: number;
  onClose: () => void;
  organizerDisplayName: string;
  isOwnProfile?: boolean;
  onEventPress?: (eventId: string) => void;
  onReelDeleted?: (reelId: string) => void;
};

type ReelFeedPageProps = {
  reel: ReelItem;
  pageHeight: number;
  pageWidth: number;
  isPageActive: boolean;
  organizerDisplayName: string;
  isOwnProfile: boolean;
  onEventPress?: (eventId: string) => void;
  onDelete: () => void;
  onShare: () => void;
  onReport?: () => void;
  showReport?: boolean;
};

function ReelFeedPage({
  reel,
  pageHeight,
  pageWidth,
  isPageActive,
  organizerDisplayName,
  isOwnProfile,
  onEventPress,
  onDelete,
  onShare,
  onReport,
  showReport = false,
}: ReelFeedPageProps) {
  const insets = useSafeAreaInsets();
  const sortedMedia = useMemo(
    () => reel.media.slice().sort((a, b) => a.order - b.order),
    [reel.media],
  );

  const actionRailBottom = Math.max(insets.bottom, theme.spacing.lg) + 96;
  const captionBottom = Math.max(insets.bottom, theme.spacing.lg) + 24;

  return (
    <View style={[styles.page, { height: pageHeight, width: pageWidth }]}>
      <MediaCarousel
        autoPlayVideo
        height={pageHeight}
        isFocused={isPageActive}
        media={sortedMedia.map((item) => ({
          id: item.id,
          url: item.url,
          type: item.type,
        }))}
      />

      <View style={[styles.captionBlock, { bottom: captionBottom }]}>
        <AppText style={styles.username} variant="label">
          {organizerDisplayName}
        </AppText>
        {reel.caption?.trim() ? (
          <AppText numberOfLines={3} style={styles.caption} variant="body">
            {reel.caption}
          </AppText>
        ) : null}
        {reel.event ? (
          <Pressable onPress={() => onEventPress?.(reel.event!.id)} style={styles.eventTag}>
            <Ionicons color="#FFFFFF" name="calendar-outline" size={14} />
            <AppText numberOfLines={1} style={styles.eventTagText} variant="caption">
              {reel.event.title}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.actionRail, { bottom: actionRailBottom }]}>
        {isOwnProfile ? (
          <Pressable onPress={onDelete} style={styles.actionButton}>
            <Ionicons color="#FFFFFF" name="trash-outline" size={30} style={styles.actionIconShadow} />
            <AppText style={styles.actionLabel} variant="caption">
              Sil
            </AppText>
          </Pressable>
        ) : null}
        <Pressable onPress={onShare} style={styles.actionButton}>
          <Ionicons color="#FFFFFF" name="share-social" size={32} style={styles.actionIconShadow} />
          <AppText style={styles.actionLabel} variant="caption">
            Paylaş
          </AppText>
        </Pressable>
        {showReport && onReport ? (
          <Pressable onPress={onReport} style={styles.actionButton}>
            <Ionicons color="#FFFFFF" name="flag-outline" size={30} style={styles.actionIconShadow} />
            <AppText style={styles.actionLabel} variant="caption">
              Şikayet
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ProfileReelsFeedViewer({
  visible,
  reels,
  initialIndex,
  onClose,
  organizerDisplayName,
  isOwnProfile = false,
  onEventPress,
  onReelDeleted,
}: ProfileReelsFeedViewerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [localReels, setLocalReels] = useState(reels);
  const [reportReel, setReportReel] = useState<ReelItem | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const clampedInitialIndex = useMemo(
    () => Math.min(Math.max(initialIndex, 0), Math.max(localReels.length - 1, 0)),
    [initialIndex, localReels.length],
  );

  useEffect(() => {
    setLocalReels(reels);
  }, [reels]);

  useEffect(() => {
    if (!visible) {
      setActiveReelId(null);
      return;
    }

    const reel = localReels[clampedInitialIndex];
    if (reel) {
      setActiveReelId(reel.id);
    }
  }, [clampedInitialIndex, localReels, visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.item && typeof first.item === "object" && "id" in first.item) {
      setActiveReelId((first.item as ReelItem).id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const confirmDelete = (reel: ReelItem) => {
    Alert.alert("Tanıtımı sil", "Bu tanıtım içeriğini silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteOrganizerReel(reel.id);
              setLocalReels((current) => {
                const next = current.filter((item) => item.id !== reel.id);
                if (next.length === 0) {
                  onClose();
                }
                return next;
              });
              onReelDeleted?.(reel.id);
            } catch (error) {
              Alert.alert(
                "Silinemedi",
                error instanceof Error ? error.message : "Tanıtım içeriği silinemedi.",
              );
            }
          })();
        },
      },
    ]);
  };

  const submitReelReport = async (reason: ComplaintReason) => {
    if (!reportReel || isReportSubmitting) {
      return;
    }

    setIsReportSubmitting(true);
    try {
      await createContentComplaint({
        targetType: "REEL",
        targetId: reportReel.id,
        reason,
      });
      setReportReel(null);
      Alert.alert("Şikayet alındı", "Şikayetiniz incelenmek üzere kaydedildi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şikayet gönderilemedi.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const shareReel = async (reel: ReelItem) => {
    const preview = reel.media.slice().sort((a, b) => a.order - b.order)[0];
    const message = reel.caption?.trim() || `${organizerDisplayName} tanıtım içeriği paylaştı`;

    try {
      await Share.share({
        message,
        url: preview?.url,
      });
    } catch {
      // User dismissed share sheet.
    }
  };

  if (!visible || localReels.length === 0) {
    return null;
  }

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.viewer}>
        <FlatList
          data={localReels}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({
            index,
            length: windowHeight,
            offset: windowHeight * index,
          })}
          initialScrollIndex={clampedInitialIndex}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ animated: false, index: info.index });
            }, 80);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          ref={listRef}
          renderItem={({ item }) => (
            <ReelFeedPage
              isOwnProfile={isOwnProfile}
              isPageActive={activeReelId === item.id}
              onDelete={() => confirmDelete(item)}
              onEventPress={onEventPress}
              onReport={() => setReportReel(item)}
              onShare={() => void shareReel(item)}
              organizerDisplayName={organizerDisplayName}
              pageHeight={windowHeight}
              pageWidth={windowWidth}
              reel={item}
              showReport={!isOwnProfile}
            />
          )}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
        />

        <Pressable
          accessibilityLabel="Geri"
          onPress={onClose}
          style={[styles.backButton, { top: Math.max(insets.top, theme.spacing.md) }]}
        >
          <Ionicons color="#FFFFFF" name="chevron-back" size={30} />
        </Pressable>
      </View>
      </Modal>

      <ComplaintReasonSheet
        isSubmitting={isReportSubmitting}
        onClose={() => setReportReel(null)}
        onSubmit={submitReelReport}
        visible={reportReel != null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  viewer: {
    backgroundColor: "#000000",
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    left: theme.spacing.sm,
    position: "absolute",
    width: 44,
    zIndex: 10,
  },
  page: {
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  captionBlock: {
    left: theme.spacing.lg,
    maxWidth: "68%",
    position: "absolute",
    zIndex: 5,
  },
  username: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: "#FFFFFF",
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventTag: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 6,
    marginTop: theme.spacing.sm,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  eventTagText: {
    color: "#FFFFFF",
    flexShrink: 1,
  },
  actionRail: {
    alignItems: "center",
    gap: theme.spacing.lg,
    position: "absolute",
    right: theme.spacing.md,
    zIndex: 5,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionIconShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
