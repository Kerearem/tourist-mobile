import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ProfileAvatarRingProps = {
  displayName: string;
  showPlus?: boolean;
};

export function ProfileAvatarRing({ displayName, showPlus = true }: ProfileAvatarRingProps) {
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.wrapper}>
      <View style={styles.ring}>
        <View style={[styles.ringAccent, styles.ringAccentWarm]} />
        <View style={[styles.ringAccent, styles.ringAccentCool]} />
        <View style={styles.avatar}>
          <AppText style={styles.initials} variant="sectionTitle">
            {initials}
          </AppText>
        </View>
      </View>
      {showPlus ? (
        <View style={styles.plusBadge}>
          <Ionicons color="#FFFFFF" name="add" size={20} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
  },
  ring: {
    alignItems: "center",
    backgroundColor: "#FF365F",
    borderRadius: 58,
    height: 116,
    justifyContent: "center",
    overflow: "hidden",
    width: 116,
  },
  ringAccent: {
    height: 74,
    position: "absolute",
    width: 74,
  },
  ringAccentWarm: {
    backgroundColor: "#FFB000",
    bottom: -16,
    left: -12,
    transform: [{ rotate: "24deg" }],
  },
  ringAccentCool: {
    backgroundColor: "#5B3CF6",
    right: -12,
    top: -14,
    transform: [{ rotate: "24deg" }],
  },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: "#FFFFFF",
    borderRadius: 52,
    borderWidth: 5,
    height: 104,
    justifyContent: "center",
    width: 104,
  },
  initials: {
    color: theme.colors.primary,
  },
  plusBadge: {
    alignItems: "center",
    backgroundColor: "#2F80ED",
    borderColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 3,
    bottom: 8,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 3,
    width: 32,
  },
});
