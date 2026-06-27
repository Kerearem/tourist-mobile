/**
 * Geçici Snap giriş ekranı — çift kamera çekimi sonraki parçada eklenecek.
 * Galeri test akışı da kaldırılacak; şimdilik simülatör/kamera olmayan ortamlar için.
 */
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { ExploreRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { ExploreStackParamList } from "../../../navigation/types";

export function ExploreCameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const insets = useSafeAreaInsets();

  const topInset = useMemo(() => Math.max(insets.top, theme.spacing.lg), [insets.top]);
  const bottomInset = useMemo(() => Math.max(insets.bottom, theme.spacing.lg), [insets.bottom]);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: topInset }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconCircle}>
          <Ionicons color="#FFFFFF" name="close" size={30} />
        </Pressable>
      </View>

      <View style={styles.centerContent}>
        <Ionicons color="rgba(255,255,255,0.35)" name="camera-outline" size={72} />
        <AppText style={styles.title} variant="sectionTitle">
          Snap
        </AppText>
        <AppText style={styles.note} variant="body">
          Çift kamera çekimi yakında eklenecek. Şimdilik galeriden test edebilirsin — çift kamera gelince galeri kalkacak.
        </AppText>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <Pressable onPress={() => navigation.navigate(ExploreRoutes.PublishSnapScreen)} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="images-outline" size={22} />
          <AppText style={styles.primaryButtonText} variant="label">
            Galeriden Snap test et
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#09090B",
    flex: 1,
  },
  topBar: {
    paddingHorizontal: theme.spacing.lg,
  },
  iconCircle: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    color: "#FFFFFF",
  },
  note: {
    color: "rgba(255, 255, 255, 0.72)",
    lineHeight: 22,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#5B3CF6",
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
