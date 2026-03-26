import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type AvatarProps = {
  uri?: string;
  size?: number;
  initials?: string;
};

export function Avatar({ uri, size = 40, initials = "TM" }: AvatarProps) {
  const boxStyle = [styles.avatar, { height: size, width: size, borderRadius: size / 2 }];

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
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
