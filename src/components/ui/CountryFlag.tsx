import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants/theme";
import { getCountryFlagEmoji, getCountryFlagImageUrl } from "../../utils/countryFlag";

type Props = {
  code: string;
  width?: number;
  height?: number;
};

export function CountryFlag({ code, width = 48, height = 32 }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getCountryFlagImageUrl(code);
  const emoji = getCountryFlagEmoji(code);

  if (!imageUrl || imageFailed) {
    return (
      <View style={[styles.emojiWrap, { width, height }]}>
        <Text style={[styles.emoji, { fontSize: height * 0.72, lineHeight: height }]}>{emoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image
        accessibilityIgnoresInvertColors
        onError={() => setImageFailed(true)}
        resizeMode="cover"
        source={{ uri: imageUrl }}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderColor: theme.colors.border,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  emojiWrap: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: theme.colors.border,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
  },
  emoji: {
    textAlign: "center",
  },
});
