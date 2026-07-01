import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

import { cloudinaryVideoPoster } from "./cloudinaryVideoPoster";

export type CarouselVideoSlideProps = {
  url: string;
  width: number;
  height: number;
  isActive: boolean;
  autoPlayVideo: boolean;
};

export function CarouselVideoSlideNative({
  url,
  width,
  height,
  isActive,
  autoPlayVideo,
}: CarouselVideoSlideProps) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = false;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isActive) {
      player.pause();
      setIsPlaying(false);
      return;
    }

    if (autoPlayVideo) {
      player.play();
      setIsPlaying(true);
    }
  }, [autoPlayVideo, isActive, player]);

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
        <VideoView contentFit="cover" nativeControls={!autoPlayVideo} player={player} style={styles.mediaFill} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
