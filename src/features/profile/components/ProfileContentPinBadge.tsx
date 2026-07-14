import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ProfileContentPinBadgeProps = {
  visible?: boolean;
};

export function ProfileContentPinBadge({ visible = false }: ProfileContentPinBadgeProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Ionicons color="#FFFFFF" name="pin" size={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    left: 8,
    position: "absolute",
    top: 8,
    width: 22,
    zIndex: 2,
  },
});
