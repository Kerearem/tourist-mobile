import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../ui/AppText";
import { theme } from "../../constants/theme";
import {
  getCreationTileSize,
  getDisplayResizeMode,
  type UserContentMediaKind,
} from "../../services/media/mediaContentContracts";

type CreationMediaTileProps = {
  uri: string;
  type: "IMAGE" | "VIDEO";
  kind: UserContentMediaKind;
  onRemove: () => void;
  orderLabel?: string;
  footer?: React.ReactNode;
};

export function CreationMediaTile({
  uri,
  type,
  kind,
  onRemove,
  orderLabel,
  footer,
}: CreationMediaTileProps) {
  const tileSize = getCreationTileSize(kind);
  const resizeMode = getDisplayResizeMode(kind);

  return (
    <View style={[styles.tile, { height: tileSize.height, width: tileSize.width }]}>
      {type === "VIDEO" ? (
        <View style={[styles.mediaFill, styles.videoPlaceholder]}>
          <Ionicons color="#FFFFFF" name="videocam" size={28} />
        </View>
      ) : (
        <Image resizeMode={resizeMode} source={{ uri }} style={styles.mediaFill} />
      )}

      {orderLabel ? (
        <View style={styles.orderBadge}>
          <AppText style={styles.orderText} variant="caption">
            {orderLabel}
          </AppText>
        </View>
      ) : null}

      {type === "VIDEO" ? (
        <View style={styles.videoBadge}>
          <Ionicons color="#FFFFFF" name="videocam" size={16} />
        </View>
      ) : null}

      {footer}

      <Pressable onPress={onRemove} style={styles.removeButton}>
        <Ionicons color="#FFFFFF" name="close" size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: theme.radius.md,
    overflow: "hidden",
    position: "relative",
  },
  mediaFill: {
    height: "100%",
    width: "100%",
  },
  videoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#111111",
    justifyContent: "center",
  },
  orderBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.sm,
    left: theme.spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: theme.spacing.xs,
  },
  orderText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  videoBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.sm,
    bottom: 28,
    left: theme.spacing.xs,
    padding: 4,
    position: "absolute",
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 28,
    width: 24,
  },
});
