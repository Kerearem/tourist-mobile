import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { EventAlbumMomentMedia } from "../types";

type MomentMediaCarouselProps = {
  media: EventAlbumMomentMedia[];
  height?: number;
};

const cloudinaryVideoPoster = (url: string) => {
  if (!url.includes("/video/upload/")) {
    return url;
  }
  return url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2");
};

function MomentVideoSlide({ url, width, height, isActive }: { url: string; width: number; height: number; isActive: boolean }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isActive) {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player]);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      return;
    }
    player.play();
    setIsPlaying(true);
  };

  return (
    <Pressable onPress={togglePlayback} style={[styles.slide, { width, height }]}>
      {!isPlaying ? (
        <>
          <Image resizeMode="cover" source={{ uri: cloudinaryVideoPoster(url) }} style={styles.mediaFill} />
          <View style={styles.playOverlay}>
            <Ionicons color="#FFFFFF" name="play-circle" size={56} />
          </View>
        </>
      ) : (
        <VideoView contentFit="cover" nativeControls player={player} style={styles.mediaFill} />
      )}
    </Pressable>
  );
}

export function MomentMediaCarousel({ media, height = 280 }: MomentMediaCarouselProps) {
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  if (media.length === 0) {
    return null;
  }

  return (
    <View
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== carouselWidth) {
          setCarouselWidth(width);
        }
      }}
      style={[styles.container, { height }]}
    >
      <ScrollView
        horizontal
        onMomentumScrollEnd={(event) => {
          if (carouselWidth <= 0) {
            return;
          }
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
          setActiveIndex(nextIndex);
        }}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {media.map((item, index) => {
          const slideWidth = carouselWidth > 0 ? carouselWidth : undefined;
          if (item.type === "VIDEO") {
            return (
              <MomentVideoSlide
                key={item.id}
                height={height}
                isActive={activeIndex === index}
                url={item.url}
                width={slideWidth ?? 0}
              />
            );
          }

          return (
            <Image
              key={item.id}
              resizeMode="cover"
              source={{ uri: item.url }}
              style={[styles.slide, styles.mediaFill, slideWidth ? { width: slideWidth, height } : { height }]}
            />
          );
        })}
      </ScrollView>
      {media.length > 1 ? (
        <View style={styles.dots}>
          {media.map((item, index) => (
            <View key={item.id} style={[styles.dot, activeIndex === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    width: "100%",
  },
  slide: {
    overflow: "hidden",
  },
  mediaFill: {
    height: "100%",
    width: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
  },
  dots: {
    bottom: theme.spacing.sm,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    position: "absolute",
    width: "100%",
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 16,
  },
});
