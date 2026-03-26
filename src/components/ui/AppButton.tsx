import React from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type AppButtonProps = PressableProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AppButton({ label, containerStyle, ...props }: AppButtonProps) {
  return (
    <Pressable style={[styles.button, containerStyle]} {...props}>
      <AppText style={styles.label}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
