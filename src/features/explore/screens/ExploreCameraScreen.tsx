import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

export function ExploreCameraScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const didLongPressRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [captureMode, setCaptureMode] = useState<"photo" | "video">("photo");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);
  const [albumAssets, setAlbumAssets] = useState<MediaLibrary.Asset[]>([]);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState<MediaLibrary.PermissionStatus | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const topInset = useMemo(() => Math.max(insets.top, theme.spacing.lg), [insets.top]);
  const bottomInset = useMemo(() => Math.max(insets.bottom, theme.spacing.lg), [insets.bottom]);

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || permission.status !== "undetermined") {
      return;
    }
    void requestPermission();
  }, [permission, requestPermission]);

  const capturePhoto = useCallback(async () => {
    if (isCapturing || isRecording || !cameraRef.current) {
      return;
    }
    try {
      setIsCapturing(true);
      await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
    } catch {
      Alert.alert("Camera error", "Photo could not be captured.");
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isRecording]);

  const startVideoRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording || isCapturing) {
      return;
    }
    try {
      setIsRecording(true);
      await cameraRef.current.recordAsync({
        maxDuration: 120,
      });
    } catch {
      Alert.alert("Camera error", "Video kaydi baslatilamadi.");
    } finally {
      setIsRecording(false);
    }
  }, [isCapturing, isRecording]);

  const stopVideoRecording = useCallback(() => {
    if (!cameraRef.current || !isRecording) {
      return;
    }
    try {
      cameraRef.current.stopRecording();
    } catch {
      setIsRecording(false);
    }
  }, [isRecording]);

  const selectMode = useCallback((mode: "photo" | "video") => {
    setCaptureMode(mode);
  }, []);

  const loadAlbumAssets = useCallback(async () => {
    setIsAlbumLoading(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        first: 120,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setAlbumAssets(result.assets);
    } finally {
      setIsAlbumLoading(false);
    }
  }, []);

  const openAlbum = useCallback(async () => {
    setIsAlbumOpen(true);
    const currentPermission = await MediaLibrary.getPermissionsAsync();
    setMediaPermissionStatus(currentPermission.status);
    if (currentPermission.granted) {
      await loadAlbumAssets();
      return;
    }
    const requestedPermission = await MediaLibrary.requestPermissionsAsync();
    setMediaPermissionStatus(requestedPermission.status);
    if (requestedPermission.granted) {
      await loadAlbumAssets();
      return;
    }
    setAlbumAssets([]);
  }, [loadAlbumAssets]);

  const renderPermissionState = () => {
    if (!permission) {
      return (
        <View style={styles.permissionBox}>
          <AppText style={styles.permissionText} variant="body">
            Camera permission is loading...
          </AppText>
        </View>
      );
    }

    if (permission.granted) {
      return null;
    }

    return (
      <View style={styles.permissionBox}>
        <AppText style={styles.permissionText} variant="body">
          Kamera kullanabilmek icin erisim izni vermen gerekiyor.
        </AppText>
        <Pressable onPress={() => void requestPermission()} style={styles.permissionButton}>
          <AppText style={styles.permissionButtonText} variant="label">
            Izin ver
          </AppText>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView facing={facing} ref={cameraRef} style={styles.camera} />
      ) : (
        <View style={styles.cameraPlaceholder} />
      )}

      <View style={[styles.topBar, { paddingTop: topInset }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconCircle}>
          <Ionicons color="#FFFFFF" name="close" size={30} />
        </Pressable>
        <Pressable style={styles.addAudioButton}>
          <Ionicons color="#FFFFFF" name="musical-note" size={15} />
          <AppText style={styles.addAudioText} variant="label">
            Ses ekle
          </AppText>
        </Pressable>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.rightRail}>
        <Pressable onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))} style={styles.railButton}>
          <Ionicons color="#FFFFFF" name="camera-reverse-outline" size={26} />
        </Pressable>
        <Pressable style={styles.railButton}>
          <Ionicons color="#FFFFFF" name="flash-off-outline" size={24} />
        </Pressable>
        <Pressable style={styles.railButton}>
          <Ionicons color="#FFFFFF" name="timer-outline" size={24} />
        </Pressable>
      </View>

      {renderPermissionState()}

      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <View style={styles.capturePanel}>
          <View style={styles.modeRow}>
            <View style={styles.modeOptions}>
              <Pressable onPress={() => selectMode("photo")} style={[styles.modeOption, captureMode === "photo" && styles.activeModePill]}>
                <AppText style={[styles.modeText, captureMode === "photo" && styles.activeModeText]} variant="caption">
                  FOTOGRAF
                </AppText>
              </Pressable>
              <Pressable onPress={() => selectMode("video")} style={[styles.modeOption, captureMode === "video" && styles.activeModePill]}>
                <AppText style={[styles.modeText, captureMode === "video" && styles.activeModeText]} variant="caption">
                  VIDEO
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.captureRow}>
            <Pressable
              delayLongPress={120}
              disabled={!permission?.granted || isCapturing}
              onLongPress={() => {
                if (captureMode === "video") {
                  return;
                }
                didLongPressRef.current = true;
                void startVideoRecording();
              }}
              onPress={() => {
                if (captureMode === "video") {
                  if (isRecording) {
                    stopVideoRecording();
                  } else {
                    void startVideoRecording();
                  }
                  return;
                }
                if (didLongPressRef.current) {
                  didLongPressRef.current = false;
                  return;
                }
                void capturePhoto();
              }}
              onPressOut={() => {
                if (didLongPressRef.current) {
                  stopVideoRecording();
                }
              }}
              style={[styles.shutterOuter, isRecording && styles.shutterOuterRecording]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomTabsBar}>
          <Pressable onPress={() => void openAlbum()} style={styles.galleryButton}>
            <Ionicons color="#FFFFFF" name="images-outline" size={25} />
          </Pressable>
          <View style={styles.bottomModeTabs}>
            <AppText style={styles.bottomModeActive} variant="label">
              PAYLAŞ
            </AppText>
            <AppText style={styles.bottomModeMuted} variant="label">
              OLUŞTUR
            </AppText>
          </View>
          <View style={styles.galleryButtonSpacer} />
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setIsAlbumOpen(false)} transparent visible={isAlbumOpen}>
        <View style={styles.albumOverlay}>
          <View style={[styles.albumContainer, { paddingTop: topInset }]}>
            <View style={styles.albumHeader}>
              <Pressable onPress={() => setIsAlbumOpen(false)} style={styles.albumCloseButton}>
                <Ionicons color="#FFFFFF" name="close" size={28} />
              </Pressable>
              <View style={styles.albumTitlePill}>
                <AppText style={styles.albumTitleText} variant="label">
                  Yakin zamanda
                </AppText>
                <Ionicons color="#FFFFFF" name="chevron-down" size={16} />
              </View>
              <View style={styles.albumCloseButton} />
            </View>

            <View style={styles.albumTabsRow}>
              {["Tumu", "Videolar", "Fotograflar", "Live Photos"].map((tab, index) => (
                <AppText key={tab} style={[styles.albumTabText, index === 0 && styles.albumTabTextActive]} variant="label">
                  {tab}
                </AppText>
              ))}
            </View>

            {mediaPermissionStatus !== "granted" ? (
              <View style={styles.albumPermissionCard}>
                <View style={styles.albumPermissionTextWrap}>
                  <Ionicons color="#FFFFFF" name="images-outline" size={22} />
                  <AppText style={styles.albumPermissionText} variant="body">
                    Tum fotograflara erisebilmek icin ayarlarinizi degistirin.
                  </AppText>
                </View>
                <Pressable onPress={() => void Linking.openSettings()} style={styles.albumPermissionAction}>
                  <AppText style={styles.albumPermissionActionText} variant="label">
                    Degistir
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {isAlbumLoading ? (
              <View style={styles.albumLoadingWrap}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <FlatList
                contentContainerStyle={styles.albumGridContent}
                data={albumAssets}
                keyExtractor={(item) => item.id}
                numColumns={3}
                renderItem={({ item }) => {
                  const isSelected = selectedAssetId === item.id;
                  return (
                    <Pressable onPress={() => setSelectedAssetId(item.id)} style={[styles.albumGridItem, isSelected && styles.albumGridItemSelected]}>
                      <Image source={{ uri: item.uri }} style={styles.albumGridImage} />
                      {item.mediaType === MediaLibrary.MediaType.video ? (
                        <View style={styles.albumVideoBadge}>
                          <Ionicons color="#FFFFFF" name="play" size={12} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={[styles.albumBottomBar, { paddingBottom: bottomInset }]}>
              <View style={styles.albumMultiPick}>
                <Ionicons color="#FF2D55" name="checkmark-circle" size={22} />
                <AppText style={styles.albumMultiPickText} variant="label">
                  Birden cok secin
                </AppText>
              </View>
              <Pressable disabled={!selectedAssetId} style={[styles.albumNextButton, !selectedAssetId && styles.albumNextButtonDisabled]}>
                <AppText style={styles.albumNextButtonText} variant="label">
                  Sonraki
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#09090B",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
  },
  iconCircle: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  addAudioButton: {
    alignItems: "center",
    backgroundColor: "rgba(23, 23, 28, 0.82)",
    borderRadius: 18,
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
  },
  addAudioText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  topBarSpacer: {
    width: 42,
  },
  rightRail: {
    gap: theme.spacing.sm,
    position: "absolute",
    right: theme.spacing.md,
    top: 120,
  },
  railButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  permissionBox: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.xl,
    marginTop: 140,
    padding: theme.spacing.lg,
  },
  permissionText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#2563EB",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  permissionButtonText: {
    color: "#FFFFFF",
  },
  bottomBar: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  capturePanel: {
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  modeRow: {
    alignSelf: "center",
    marginBottom: theme.spacing.lg,
  },
  modeOptions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  modeOption: {
    alignItems: "center",
    borderRadius: 20,
    justifyContent: "center",
    marginHorizontal: theme.spacing.xs,
    minHeight: 34,
    minWidth: 108,
    paddingHorizontal: theme.spacing.md,
  },
  modeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  activeModePill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
  },
  activeModeText: {
    color: "#09090B",
    fontWeight: "700",
  },
  captureRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 84,
  },
  shutterOuter: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 42,
    borderWidth: 4,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  shutterOuterRecording: {
    borderColor: "#FF3B30",
  },
  shutterInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  bottomTabsBar: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 74,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  galleryButton: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 10,
    borderWidth: 1.5,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  galleryButtonSpacer: {
    width: 40,
  },
  bottomModeTabs: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xl,
    justifyContent: "center",
  },
  bottomModeActive: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  bottomModeMuted: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  albumOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    flex: 1,
  },
  albumContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  albumHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  albumCloseButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  albumTitlePill: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
  },
  albumTitleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  albumTabsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  albumTabText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 16,
  },
  albumTabTextActive: {
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
  albumPermissionCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  albumPermissionTextWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  albumPermissionText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 14,
  },
  albumPermissionAction: {
    backgroundColor: "#FF2D55",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  albumPermissionActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  albumLoadingWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  albumGridContent: {
    gap: 2,
    paddingBottom: theme.spacing.lg,
  },
  albumGridItem: {
    aspectRatio: 1,
    margin: 1,
    overflow: "hidden",
    width: "32.8%",
  },
  albumGridItemSelected: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  albumGridImage: {
    height: "100%",
    width: "100%",
  },
  albumVideoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 22,
  },
  albumBottomBar: {
    alignItems: "center",
    backgroundColor: "rgba(18, 18, 20, 0.96)",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
    marginTop: "auto",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  albumMultiPick: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  albumMultiPickText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  albumNextButton: {
    alignItems: "center",
    backgroundColor: "#1F2937",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 130,
    paddingHorizontal: theme.spacing.lg,
  },
  albumNextButtonDisabled: {
    opacity: 0.5,
  },
  albumNextButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
});
