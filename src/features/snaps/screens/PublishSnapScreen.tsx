import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { getMediaContentContract } from "../../../services/media/mediaContentContracts";
import { useAuth } from "../../../hooks/useAuth";
import { resetExploreToFeed } from "../../../navigation/explore/resetExploreStack";
import type { ExploreStackParamList } from "../../../navigation/types";
import { uploadImage } from "../../../services/media/cloudinary";
import { createSnap } from "../services/snaps.service";

type Props = NativeStackScreenProps<ExploreStackParamList, "PublishSnapScreen">;

export function PublishSnapScreen({ navigation, route }: Props) {
  const { frontUri, backUri } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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

  useEffect(() => {
    if (!frontUri?.trim() || !backUri?.trim()) {
      navigation.goBack();
    }
  }, [backUri, frontUri, navigation]);

  const onPublish = async () => {
    if (!frontUri || !backUri) {
      setError("Fotoğraflar bulunamadı. Lütfen tekrar çek.");
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

  if (!frontUri || !backUri) {
    return null;
  }

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
        <View style={styles.heroWrap}>
          <Image resizeMode="cover" source={{ uri: backUri }} style={styles.heroImage} />
          <View style={styles.frontInset}>
            <Image resizeMode="cover" source={{ uri: frontUri }} style={styles.frontImage} />
          </View>
        </View>

        <AppText style={styles.previewGuidance} variant="caption">
          {getMediaContentContract("snap").previewGuidance}
        </AppText>

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
          disabled={isSubmitting}
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
  heroWrap: {
    aspectRatio: 0.75,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    width: "100%",
  },
  previewGuidance: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  frontInset: {
    borderColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    borderWidth: 2,
    height: 120,
    overflow: "hidden",
    position: "absolute",
    right: theme.spacing.md,
    top: theme.spacing.md,
    width: 88,
  },
  frontImage: {
    height: "100%",
    width: "100%",
  },
  error: {
    color: "#DC2626",
  },
});
