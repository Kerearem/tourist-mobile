/**
 * GEÇİCİ ekran — çift kamera çekim UI'ı (ExploreCameraScreen) sonraki parçada
 * eklenecek. Şimdilik galeriden 2 foto seçilerek Snap yayın akışı test edilir.
 */
import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { resetExploreToFeed } from "../../../navigation/explore/resetExploreStack";
import type { ExploreStackParamList } from "../../../navigation/types";
import { pickGalleryImage } from "../../../services/media/pickGalleryImage";
import { uploadImage } from "../../../services/media/cloudinary";
import { createSnap } from "../services/snaps.service";

type Props = NativeStackScreenProps<ExploreStackParamList, "PublishSnapScreen">;

type PhotoSlot = "front" | "back";

export function PublishSnapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationText, setLocationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const defaultLocation = useMemo(() => {
    if (!user) {
      return "";
    }
    const city = user.publicProfile.currentCity || user.privateProfile.destinationCity;
    const country = user.privateProfile.destinationCountryCode;
    if (city && country) {
      return `${city}, ${country}`;
    }
    return city || country || "";
  }, [user]);

  const pickPhoto = async (slot: PhotoSlot) => {
    try {
      const uri = await pickGalleryImage();
      if (!uri) {
        return;
      }

      if (slot === "front") {
        setFrontUri(uri);
      } else {
        setBackUri(uri);
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fotoğraf seçilemedi.");
    }
  };

  const onPublish = async () => {
    if (!frontUri || !backUri) {
      setError("Ön ve arka fotoğraf seçmelisin.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const [frontMediaUrl, backMediaUrl] = await Promise.all([
        uploadImage(frontUri, { folder: "snaps" }),
        uploadImage(backUri, { folder: "snaps" }),
      ]);

      await createSnap({
        frontMediaUrl,
        backMediaUrl,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
        ...(locationText.trim() ? { locationText: locationText.trim() } : {}),
      });

      resetExploreToFeed(navigation);

      Alert.alert("Snap paylaşıldı", "Snap'in başarıyla yayınlandı.", [
        {
          text: "Tamam",
          onPress: () => {
            navigation.getParent()?.navigate(TabRoutes.ProfileTab);
          },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Snap paylaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhotoSlot = (slot: PhotoSlot, label: string, uri: string | null) => (
    <Pressable onPress={() => void pickPhoto(slot)} style={styles.photoSlot}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons color={theme.colors.muted} name="image-outline" size={28} />
          <AppText style={styles.photoPlaceholderText} variant="caption">
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons color={theme.colors.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <AppText variant="sectionTitle">Snap Paylaş</AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText style={styles.tempNote} variant="caption">
          Geçici test akışı: galeriden 2 foto seç. Çift kamera çekimi sonraki parçada eklenecek.
        </AppText>

        <View style={styles.photoRow}>
          {renderPhotoSlot("front", "Ön kamera", frontUri)}
          {renderPhotoSlot("back", "Arka kamera", backUri)}
        </View>

        <AppInput
          label="Caption (opsiyonel)"
          multiline
          numberOfLines={3}
          onChangeText={setCaption}
          placeholder="Bir şeyler yaz..."
          value={caption}
        />

        <AppInput
          label="Konum (opsiyonel)"
          onChangeText={setLocationText}
          placeholder={defaultLocation || "Berlin, DE"}
          value={locationText}
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton
          disabled={isSubmitting || !frontUri || !backUri}
          label={isSubmitting ? "Paylaşılıyor..." : "Snap Paylaş"}
          onPress={() => void onPublish()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  tempNote: {
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  photoSlot: {
    aspectRatio: 0.75,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  photoPreview: {
    height: "100%",
    width: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  photoPlaceholderText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  error: {
    color: "#DC2626",
  },
});
