import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cloudinaryVideoPoster } from "../../../components/media/MediaCarousel";
import { getMediaGridTileMetrics } from "../../../services/media/mediaContentContracts";
import { theme } from "../../../constants/theme";
import type { EventAlbumMoment } from "../types";
import { EventMomentFeedViewer } from "./EventMomentFeedViewer";

type EventMomentsGridProps = {
  eventId: string;
  moments: EventAlbumMoment[];
  /** When omitted, grid spans full screen width (ProfileSnapsGrid parity). */
  containerWidth?: number;
};

const momentThumbnailUri = (moment: EventAlbumMoment) => {
  const first = moment.media[0];
  if (!first) {
    return null;
  }
  if (first.type === "VIDEO") {
    return cloudinaryVideoPoster(first.url);
  }
  return first.url;
};

export function EventMomentsGrid({ containerWidth, eventId, moments }: EventMomentsGridProps) {
  const { width: windowWidth } = useWindowDimensions();
  const gridWidth = containerWidth ?? windowWidth;
  const [feedInitialIndex, setFeedInitialIndex] = useState(0);
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  const { tileSize, tileHeight } = useMemo(() => getMediaGridTileMetrics("moment", gridWidth), [gridWidth]);

  const openMomentFeed = (index: number) => {
    setFeedInitialIndex(index);
    setIsFeedOpen(true);
  };

  return (
    <>
      <View style={[styles.grid, { width: gridWidth }]}>
        {moments.map((moment, index) => {
          const thumbnailUri = momentThumbnailUri(moment);
          const hasMultipleMedia = moment.media.length > 1;

          return (
            <Pressable
              key={moment.id}
              onPress={() => openMomentFeed(index)}
              style={[styles.tile, { height: tileHeight, width: tileSize }]}
            >
              {thumbnailUri ? (
                <Image resizeMode="cover" source={{ uri: thumbnailUri }} style={styles.tileImage} />
              ) : (
                <View style={styles.tilePlaceholder} />
              )}
              {hasMultipleMedia ? (
                <View style={styles.multiMediaBadge}>
                  <Ionicons color="#FFFFFF" name="copy-outline" size={16} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <EventMomentFeedViewer
        eventId={eventId}
        initialIndex={feedInitialIndex}
        moments={moments}
        onClose={() => setIsFeedOpen(false)}
        visible={isFeedOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tile: {
    backgroundColor: "#111827",
    borderColor: "#FFFFFF",
    borderWidth: 1,
    overflow: "hidden",
  },
  tileImage: {
    height: "100%",
    width: "100%",
  },
  tilePlaceholder: {
    backgroundColor: theme.colors.border,
    height: "100%",
    width: "100%",
  },
  multiMediaBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: theme.radius.sm,
    bottom: 8,
    justifyContent: "center",
    padding: 4,
    position: "absolute",
    right: 8,
  },
});
