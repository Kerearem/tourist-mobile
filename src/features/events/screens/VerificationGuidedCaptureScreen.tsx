import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import * as Device from "expo-device";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { VerificationGuidedCaptureOverlay } from "../components/organizer-application/VerificationGuidedCaptureOverlay";
import { getGuidedCaptureCopy } from "../utils/organizer-verification-capture";
import {
  checkVerificationCameraAvailable,
  resolveVerificationCameraAvailabilityState,
  SIMULATOR_CAMERA_UNAVAILABLE_MESSAGE,
} from "../utils/organizer-verification-camera";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "VerificationGuidedCaptureScreen"
>;

type CapturePhase = "camera" | "capturing" | "preview";

const CAPTURE_QUALITY = 0.9;

export function VerificationGuidedCaptureScreen({ navigation, route }: Props) {
  const { documentType, mode } = route.params;
  const copy = getGuidedCaptureCopy(mode);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<CapturePhase>("camera");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [isCheckingCamera, setIsCheckingCamera] = useState(true);
  const facing: CameraType = mode === "selfie" ? "front" : "back";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsCheckingCamera(true);
      const available = await checkVerificationCameraAvailable();
      if (!cancelled) {
        setCameraAvailable(available);
        setIsCheckingCamera(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || !cameraAvailable) {
      return;
    }

    void requestPermission();
  }, [cameraAvailable, permission, requestPermission]);

  const availabilityState = resolveVerificationCameraAvailabilityState({
    isChecking: isCheckingCamera,
    cameraAvailable,
    permissionGranted: permission?.granted ?? null,
  });

  const resetCapture = useCallback(() => {
    setPreviewUri(null);
    setPhase("camera");
  }, []);

  const openGalleryFallback = useCallback(() => {
    navigation.navigate({
      name: "OrganizerApplicationScreen",
      params: {
        openGalleryForDocumentType: documentType,
      },
      merge: true,
    });
  }, [documentType, navigation]);

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

  const onCapture = useCallback(async () => {
    if (phase !== "camera" || availabilityState !== "ready") {
      return;
    }

    try {
      setPhase("capturing");
      const uri = await takePhoto();
      setPreviewUri(uri);
      setPhase("preview");
    } catch {
      // Gallery is a SIMULATOR-ONLY escape hatch; on real devices the guided
      // camera is the only path for identity/selfie documents.
      if (Device.isDevice) {
        Alert.alert("Kamera hatası", "Fotoğraf çekilemedi. Lütfen tekrar dene.", [
          { text: "Tekrar Dene", style: "cancel", onPress: resetCapture },
        ]);
      } else {
        Alert.alert("Kamera hatası", "Fotoğraf çekilemedi. Galeriden seçerek devam edebilirsin.", [
          { text: "Galeriden Seç", onPress: openGalleryFallback },
          { text: "Tekrar Dene", style: "cancel", onPress: resetCapture },
        ]);
      }
      resetCapture();
    }
  }, [availabilityState, openGalleryFallback, phase, resetCapture, takePhoto]);

  const onConfirm = useCallback(() => {
    if (!previewUri) {
      return;
    }

    navigation.navigate({
      name: "OrganizerApplicationScreen",
      params: {
        captureResult: {
          documentType,
          uri: previewUri,
        },
      },
      merge: true,
    });
  }, [documentType, navigation, previewUri]);

  if (phase === "preview" && previewUri) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
          <Pressable accessibilityLabel="Geri" onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <AppText style={styles.topBarTitle} variant="label">
            {copy.previewTitle}
          </AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.previewBody}>
          <Image resizeMode="contain" source={{ uri: previewUri }} style={styles.previewImage} />
        </View>

        <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable onPress={resetCapture} style={styles.secondaryAction}>
            <AppText style={styles.secondaryActionText} variant="label">
              {copy.retakeLabel}
            </AppText>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.primaryAction}>
            <AppText style={styles.primaryActionText} variant="label">
              {copy.confirmLabel}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (availabilityState === "checking") {
    return (
      <View style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      </View>
    );
  }

  if (availabilityState === "unavailable") {
    // SIMULATOR-ONLY state: availability is now derived from Device.isDevice,
    // so real devices never land here. The gallery fallback exists solely for
    // development/simulator testing where no camera hardware is present.
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
          <Pressable accessibilityLabel="Geri" onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <AppText style={styles.topBarTitle} variant="label">
            {copy.title}
          </AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.centerState}>
          <Ionicons color="rgba(255,255,255,0.5)" name="camera-outline" size={64} />
          <AppText style={styles.permissionTitle} variant="sectionTitle">
            Kamera kullanılamıyor
          </AppText>
          <AppText style={styles.permissionText} variant="body">
            {SIMULATOR_CAMERA_UNAVAILABLE_MESSAGE}
          </AppText>
        </View>

        <View style={[styles.fallbackActions, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.secondaryAction}>
            <AppText style={styles.secondaryActionText} variant="label">
              Geri Dön
            </AppText>
          </Pressable>
          <Pressable onPress={openGalleryFallback} style={styles.primaryAction}>
            <AppText style={styles.primaryActionText} variant="label">
              Galeriden Seç
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {availabilityState === "ready" ? (
        <CameraView facing={facing} mode="picture" ref={cameraRef} style={styles.camera} />
      ) : (
        <View style={styles.centerState}>
          <Ionicons color="rgba(255,255,255,0.5)" name="camera-outline" size={64} />
          <AppText style={styles.permissionTitle} variant="sectionTitle">
            Kamera izni gerekli
          </AppText>
          <AppText style={styles.permissionText} variant="body">
            Belge fotoğrafı çekmek için kameraya erişim izni vermelisin.
          </AppText>
          {permission?.canAskAgain ? (
            <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
              <AppText style={styles.permissionButtonText} variant="label">
                İzin ver
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Kamera izni için ayarları aç"
              onPress={() => void Linking.openSettings()}
              style={styles.permissionButton}
            >
              <AppText style={styles.permissionButtonText} variant="label">
                Ayarları Aç
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {availabilityState === "ready" ? <VerificationGuidedCaptureOverlay copy={copy} mode={mode} /> : null}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
        <Pressable accessibilityLabel="İptal" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons color="#FFFFFF" name="close" size={28} />
        </Pressable>
        <AppText style={styles.topBarTitle} variant="label">
          {copy.title}
        </AppText>
        <View style={styles.iconButton} />
      </View>

      {availabilityState === "ready" ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable
            accessibilityLabel="Fotoğraf çek"
            disabled={phase === "capturing"}
            onPress={() => void onCapture()}
            style={styles.shutterOuter}
          >
            {phase === "capturing" ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
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
    ...StyleSheet.absoluteFillObject,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
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
    zIndex: 2,
  },
  topBarTitle: {
    color: "#FFFFFF",
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  bottomBar: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  fallbackActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  shutterOuter: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  shutterInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  permissionTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  permissionText: {
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  permissionButtonText: {
    color: "#FFFFFF",
  },
  previewBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 72,
  },
  previewImage: {
    borderRadius: theme.radius.lg,
    height: "100%",
    width: "100%",
  },
  previewActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  secondaryActionText: {
    color: "#FFFFFF",
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  primaryActionText: {
    color: "#FFFFFF",
  },
});
