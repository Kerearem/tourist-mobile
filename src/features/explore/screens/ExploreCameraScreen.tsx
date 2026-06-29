import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { ExploreRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { ExploreStackParamList } from "../../../navigation/types";

type CapturePhase = "idle" | "capturing_back" | "switching" | "capturing_front" | "preview";

const CAMERA_SWITCH_MS = 800;
const SELFIE_COUNTDOWN_SECONDS = 2;
const CAPTURE_QUALITY = 0.82;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function ExploreCameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [facing, setFacing] = useState<CameraType>("back");
  const [backUri, setBackUri] = useState<string | null>(null);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraMounted, setIsCameraMounted] = useState(true);

  const isBusy = phase === "capturing_back" || phase === "capturing_front";
  const showCamera = phase !== "preview" && isCameraMounted;
  const showShutter = (phase === "idle" || phase === "capturing_back") && permission?.granted;

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) {
      return;
    }
    void requestPermission();
  }, [permission, requestPermission]);

  const resetCapture = useCallback(() => {
    setBackUri(null);
    setFrontUri(null);
    setCountdown(null);
    setFacing("back");
    setPhase("idle");
    setIsCameraMounted(true);
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error("Kamera hazır değil.");
    }

    const result = await cameraRef.current.takePictureAsync({
      quality: CAPTURE_QUALITY,
      skipProcessing: false,
    });

    if (!result?.uri) {
      throw new Error("Fotoğraf kaydedilemedi.");
    }

    return result.uri;
  }, []);

  const beginFrontCaptureSequence = useCallback(async () => {
    setPhase("switching");
    setCountdown(SELFIE_COUNTDOWN_SECONDS);
    setIsCameraMounted(false);

    await sleep(CAMERA_SWITCH_MS);
    setFacing("front");
    setIsCameraMounted(true);
    await sleep(CAMERA_SWITCH_MS);

    for (let remaining = SELFIE_COUNTDOWN_SECONDS; remaining > 0; remaining -= 1) {
      setCountdown(remaining);
      await sleep(1000);
    }

    setCountdown(null);
    setPhase("capturing_front");
  }, []);

  const captureBackPhoto = useCallback(async () => {
    if (phase !== "idle" || !permission?.granted) {
      return;
    }

    try {
      setPhase("capturing_back");
      const uri = await takePhoto();
      setBackUri(uri);
      await beginFrontCaptureSequence();
    } catch {
      Alert.alert("Kamera hatası", "Arka kamera fotoğrafı çekilemedi. Tekrar dene.");
      resetCapture();
    }
  }, [beginFrontCaptureSequence, permission?.granted, phase, resetCapture, takePhoto]);

  useEffect(() => {
    if (phase !== "capturing_front") {
      return;
    }

    let cancelled = false;

    void (async () => {
      await sleep(350);

      if (cancelled) {
        return;
      }

      try {
        const uri = await takePhoto();
        if (cancelled) {
          return;
        }
        setFrontUri(uri);
        setPhase("preview");
        setIsCameraMounted(false);
      } catch {
        if (!cancelled) {
          Alert.alert("Kamera hatası", "Selfie çekilemedi. Tekrar dene.");
          resetCapture();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, resetCapture, takePhoto]);

  const onContinueToPublish = () => {
    if (!frontUri || !backUri) {
      return;
    }

    navigation.navigate(ExploreRoutes.PublishSnapScreen, {
      frontUri,
      backUri,
    });
  };

  const renderPermissionState = () => {
    if (!permission) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      );
    }

    if (permission.granted) {
      return null;
    }

    return (
      <View style={styles.centerState}>
        <Ionicons color="rgba(255,255,255,0.5)" name="camera-outline" size={64} />
        <AppText style={styles.permissionTitle} variant="sectionTitle">
          Kamera izni gerekli
        </AppText>
        <AppText style={styles.permissionText} variant="body">
          Snap çekmek için kameraya erişim izni vermelisin. Simülatörde kamera çalışmaz; fiziksel cihazda dene.
        </AppText>
        {permission.canAskAgain ? (
          <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
            <AppText style={styles.permissionButtonText} variant="label">
              İzin ver
            </AppText>
          </Pressable>
        ) : (
          <AppText style={styles.permissionHint} variant="caption">
            İzin reddedildi. Ayarlar → Tourist → Kamera üzerinden açabilirsin.
          </AppText>
        )}
      </View>
    );
  };

  const renderSwitchOverlay = () => {
    if (phase !== "switching" && phase !== "capturing_front") {
      return null;
    }

    return (
      <View style={styles.switchOverlay}>
        <AppText style={styles.switchTitle} variant="sectionTitle">
          {phase === "capturing_front" ? "Selfie çekiliyor..." : "Şimdi selfie!"}
        </AppText>
        {countdown != null ? (
          <AppText style={styles.countdownText} variant="title">
            {countdown}
          </AppText>
        ) : phase === "capturing_front" ? (
          <ActivityIndicator color="#FFFFFF" size="large" />
        ) : null}
      </View>
    );
  };

  const renderPreview = () => {
    if (phase !== "preview" || !backUri || !frontUri) {
      return null;
    }

    return (
      <View style={styles.previewContainer}>
        <View style={[styles.previewTopBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <AppText style={styles.previewTitle} variant="label">
            Önizleme
          </AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.previewBody}>
          <View style={styles.heroWrap}>
            <Image resizeMode="cover" source={{ uri: backUri }} style={styles.heroImage} />
            <View style={styles.frontInset}>
              <Image resizeMode="cover" source={{ uri: frontUri }} style={styles.frontImage} />
            </View>
          </View>
        </View>

        <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable onPress={resetCapture} style={styles.secondaryAction}>
            <AppText style={styles.secondaryActionText} variant="label">
              Yeniden çek
            </AppText>
          </Pressable>
          <Pressable onPress={onContinueToPublish} style={styles.primaryAction}>
            <AppText style={styles.primaryActionText} variant="label">
              Paylaş
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  if (phase === "preview") {
    return renderPreview();
  }

  return (
    <View style={styles.container}>
      {permission?.granted && showCamera ? (
        <CameraView facing={facing} mode="picture" ref={cameraRef} style={styles.camera} />
      ) : (
        renderPermissionState()
      )}

      {renderSwitchOverlay()}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons color="#FFFFFF" name="close" size={28} />
        </Pressable>
        <AppText style={styles.topTitle} variant="label">
          {phase === "idle" || phase === "capturing_back" ? "Snap çek" : "Selfie zamanı"}
        </AppText>
        <View style={styles.iconButton} />
      </View>

      {phase === "idle" && permission?.granted ? (
        <View style={styles.hintPill}>
          <AppText style={styles.hintText} variant="caption">
            Önce ortam, ardından otomatik selfie
          </AppText>
        </View>
      ) : null}

      {showShutter ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable
            disabled={isBusy}
            onPress={() => void captureBackPhoto()}
            style={[styles.shutterOuter, isBusy && styles.shutterDisabled]}
          >
            {phase === "capturing_back" ? (
              <ActivityIndicator color="#111827" size="small" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  permissionTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  permissionText: {
    color: "rgba(255, 255, 255, 0.78)",
    lineHeight: 22,
    textAlign: "center",
  },
  permissionHint: {
    color: "rgba(255, 255, 255, 0.65)",
    lineHeight: 18,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  permissionButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: theme.spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  hintPill: {
    alignSelf: "center",
    backgroundColor: "rgba(17, 24, 39, 0.62)",
    borderRadius: 999,
    bottom: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: "absolute",
  },
  hintText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  bottomBar: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  shutterOuter: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  shutterDisabled: {
    opacity: 0.7,
  },
  shutterInner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#111827",
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    width: 60,
  },
  switchOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  switchTitle: {
    color: "#FFFFFF",
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  countdownText: {
    color: "#FFFFFF",
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 80,
  },
  previewContainer: {
    backgroundColor: "#09090B",
    flex: 1,
  },
  previewTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  previewBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  heroWrap: {
    aspectRatio: 0.75,
    backgroundColor: "#111827",
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
  previewActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: theme.radius.lg,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#5B3CF6",
    borderRadius: theme.radius.lg,
    flex: 1.2,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
