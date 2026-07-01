import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../../../constants/theme";

type BeRealSnapMediaProps = {
  frontMediaUrl: string;
  backMediaUrl: string;
  style?: StyleProp<ViewStyle>;
};

export function BeRealSnapMedia({ frontMediaUrl, backMediaUrl, style }: BeRealSnapMediaProps) {
  const [isSwapped, setIsSwapped] = useState(false);

  const mainUri = isSwapped ? frontMediaUrl : backMediaUrl;
  const insetUri = isSwapped ? backMediaUrl : frontMediaUrl;

  return (
    <View style={[styles.container, style]}>
      <Image resizeMode="cover" source={{ uri: mainUri }} style={styles.mainImage} />

      <Pressable onPress={() => setIsSwapped((current) => !current)} style={styles.insetWrap}>
        <Image resizeMode="cover" source={{ uri: insetUri }} style={styles.insetImage} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  mainImage: {
    height: "100%",
    width: "100%",
  },
  insetWrap: {
    borderRadius: theme.radius.md,
    height: 148,
    overflow: "hidden",
    position: "absolute",
    right: theme.spacing.lg,
    top: theme.spacing.xxl + 36,
    width: 108,
    zIndex: 4,
  },
  insetImage: {
    height: "100%",
    width: "100%",
  },
});
