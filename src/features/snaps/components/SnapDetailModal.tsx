import React from "react";
import { Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { SnapItem } from "../types";

type SnapDetailModalProps = {
  snap: SnapItem | null;
  visible: boolean;
  onClose: () => void;
};

const formatSnapDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function SnapDetailModal({ snap, visible, onClose }: SnapDetailModalProps) {
  if (!snap) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons color={theme.colors.textPrimary} name="close" size={28} />
          </Pressable>
          <AppText variant="sectionTitle">Snap</AppText>
          <View style={styles.closeButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroWrap}>
            <Image resizeMode="cover" source={{ uri: snap.backMediaUrl }} style={styles.heroImage} />
            <View style={styles.frontInset}>
              <Image resizeMode="cover" source={{ uri: snap.frontMediaUrl }} style={styles.frontImage} />
            </View>
          </View>

          {snap.caption ? (
            <AppText style={styles.caption} variant="body">
              {snap.caption}
            </AppText>
          ) : null}

          {snap.locationText ? (
            <View style={styles.locationRow}>
              <Ionicons color={theme.colors.muted} name="location-outline" size={16} />
              <AppText variant="bodyMuted">{snap.locationText}</AppText>
            </View>
          ) : null}

          <AppText style={styles.dateText} variant="caption">
            {formatSnapDate(snap.createdAt)}
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  closeButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  heroWrap: {
    aspectRatio: 0.75,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    width: "100%",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  frontInset: {
    borderColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 2,
    height: 140,
    overflow: "hidden",
    position: "absolute",
    right: theme.spacing.md,
    top: theme.spacing.md,
    width: 100,
  },
  frontImage: {
    height: "100%",
    width: "100%",
  },
  caption: {
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  dateText: {
    color: theme.colors.muted,
  },
});
