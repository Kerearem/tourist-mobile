import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type AvatarProps = {
  uri?: string;
  size?: "sm" | "md" | "lg" | number;
  initials?: string;
};

const avatarSizes = {
  sm: 28,
  md: 40,
  lg: 56,
} as const;

export function Avatar({ uri, size = "md", initials = "TM" }: AvatarProps) {
  const resolvedSize = typeof size === "number" ? size : avatarSizes[size];
  const boxStyle = [styles.avatar, { height: resolvedSize, width: resolvedSize, borderRadius: resolvedSize / 2 }];

  if (uri) {
    return <Image source={{ uri }} style={boxStyle} />;
  }

  return (
    <View style={boxStyle}>
      <AppText style={styles.initials}>{initials}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    justifyContent: "center",
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
