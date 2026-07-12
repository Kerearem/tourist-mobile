import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useVideoPlayer, VideoView } from "expo-video";

import { AppText } from "../ui/AppText";
import { theme } from "../../constants/theme";
import type { UserContentMediaKind } from "../../services/media/mediaContentContracts";
import { getMediaContentContract } from "../../services/media/mediaContentContracts";

type LocalVideoPreviewProps = {
  uri: string;
};

const isExpoVideoNativeModuleAvailable = requireOptionalNativeModule("ExpoVideo") != null;

function LocalVideoPreviewNative({ uri }: LocalVideoPreviewProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    player.play();
    setIsPlaying(true);
    return () => {
      player.pause();
    };
  }, [player]);

  return (
    <Pressable
      onPress={() => {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
          return;
        }
        player.play();
        setIsPlaying(true);
      }}
      style={styles.mediaFill}
    >
      <VideoView contentFit="cover" nativeControls={false} player={player} style={styles.mediaFill} />
      {!isPlaying ? (
        <View style={styles.playOverlay}>
          <Ionicons color="#FFFFFF" name="play-circle" size={48} />
        </View>
      ) : null}
    </Pressable>
  );
}

function LocalVideoPreviewFallback() {
  return (
    <View style={[styles.mediaFill, styles.fallback]}>
      <Ionicons color="#FFFFFF" name="videocam-outline" size={40} />
      <AppText style={styles.fallbackText} variant="caption">
        Video önizlemesi cihazda oynatılır
      </AppText>
    </View>
  );
}

export function LocalVideoPreview(props: LocalVideoPreviewProps) {
  if (isExpoVideoNativeModuleAvailable) {
    return <LocalVideoPreviewNative {...props} />;
  }
  return <LocalVideoPreviewFallback />;
}

type MediaPreviewFrameProps = {
  uri: string;
  type: "IMAGE" | "VIDEO";
  kind: UserContentMediaKind;
  width?: number | `${number}%`;
};

export function MediaPreviewFrame({ uri, type, kind, width = "100%" }: MediaPreviewFrameProps) {
  const contract = getMediaContentContract(kind);
  const aspectRatio = contract.aspectWidth / contract.aspectHeight;

  return (
    <View style={[styles.wrapper, { aspectRatio, width }]}>
      {type === "VIDEO" ? (
        <View style={styles.mediaFill}>
          <LocalVideoPreview uri={uri} />
        </View>
      ) : (
        <Image
          resizeMode={contract.displayResizeMode}
          source={{ uri }}
          style={styles.mediaFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    backgroundColor: "#000000",
    borderRadius: theme.radius.md,
    maxWidth: "100%",
    overflow: "hidden",
    width: "100%",
  },
  mediaFill: {
    height: "100%",
    width: "100%",
  },
  fallback: {
    alignItems: "center",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
  },
  fallbackText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
  },
});
