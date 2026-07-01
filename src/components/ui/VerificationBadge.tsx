import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../../constants/theme";
import type { VerificationBadgeType } from "../../utils/verificationBadge";

const badgeColors: Record<VerificationBadgeType, string> = {
  organizer: "#7C3AED",
  business: theme.colors.primary,
};

type VerificationBadgeProps = {
  type: VerificationBadgeType;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function VerificationBadge({ type, size = 16, style }: VerificationBadgeProps) {
  return (
    <View accessibilityLabel={type === "business" ? "Doğrulanmış işletme" : "Doğrulanmış organizatör"} style={[styles.wrap, style]}>
      <Ionicons color={badgeColors[type]} name="checkmark-circle" size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
