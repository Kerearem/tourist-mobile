import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { createEventMoment } from "../services/events.service";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { uploadImage, uploadVideo } from "../../../services/media/cloudinary";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "CreateMomentScreen"
>;

type SelectedMedia = {
  id: string;
  uri: string;
  type: "IMAGE" | "VIDEO";
};

const MAX_MEDIA = 10;

export function CreateMomentScreen({ navigation, route }: Props) {
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      setError(`En fazla ${MAX_MEDIA} medya seçebilirsin.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Galeri erişim izni gerekli.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - media.length,
      quality: 0.85,
      videoMaxDuration: 60,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const nextItems: SelectedMedia[] = result.assets.map((asset) => ({
      id: `${asset.assetId ?? asset.uri}_${Date.now()}_${Math.random()}`,
      uri: asset.uri,
      type: asset.type === "video" ? "VIDEO" : "IMAGE",
    }));

    setMedia((current) => [...current, ...nextItems].slice(0, MAX_MEDIA));
    setError(null);
  };

  const removeMedia = (id: string) => {
    setMedia((current) => current.filter((item) => item.id !== id));
  };

  const submitMoment = async () => {
    if (media.length === 0 || isSubmitting) {
      setError("En az bir fotoğraf veya video seçmelisin.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const uploadedMedia: Array<{ url: string; type: "IMAGE" | "VIDEO"; order: number }> = [];

      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        setUploadProgress(`${index + 1}/${media.length} yükleniyor...`);

        const url =
          item.type === "VIDEO"
            ? await uploadVideo(item.uri, { folder: "events/moments" })
            : await uploadImage(item.uri, { folder: "events/moments" });

        uploadedMedia.push({
          url,
          type: item.type,
          order: index,
        });
      }

      await createEventMoment(route.params.eventId, {
        caption: caption.trim() || undefined,
        media: uploadedMedia,
      });

      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Anı paylaşılamadı.");
    } finally {
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Anı Paylaş" />

        <AppText style={styles.hint} variant="bodyMuted">
          Etkinlikten 1-10 fotoğraf veya video seç. Kişi başına bir anı paylaşabilirsin.
        </AppText>

        <View style={styles.mediaGrid}>
          {media.map((item) => (
            <View key={item.id} style={styles.mediaTile}>
              <Image resizeMode="cover" source={{ uri: item.uri }} style={styles.mediaPreview} />
              {item.type === "VIDEO" ? (
                <View style={styles.videoBadge}>
                  <Ionicons color="#FFFFFF" name="videocam" size={16} />
                </View>
              ) : null}
              <Pressable onPress={() => removeMedia(item.id)} style={styles.removeButton}>
                <Ionicons color="#FFFFFF" name="close" size={16} />
              </Pressable>
            </View>
          ))}

          {media.length < MAX_MEDIA ? (
            <Pressable disabled={isSubmitting} onPress={() => void pickMedia()} style={styles.addTile}>
              <Ionicons color={theme.colors.primary} name="add" size={32} />
              <AppText variant="caption">Ekle</AppText>
            </Pressable>
          ) : null}
        </View>

        <AppInput
          label="Açıklama (opsiyonel)"
          multiline
          numberOfLines={3}
          onChangeText={setCaption}
          placeholder="Bu anıyı kısaca anlat..."
          value={caption}
        />

        {uploadProgress ? (
          <View style={styles.progressRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <AppText variant="bodyMuted">{uploadProgress}</AppText>
          </View>
        ) : null}

        {error ? (
          <AppText style={styles.errorText} variant="bodyMuted">
            {error}
          </AppText>
        ) : null}

        <AppButton
          disabled={media.length === 0}
          label="Anıyı paylaş"
          loading={isSubmitting}
          onPress={() => void submitMoment()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  hint: {
    color: theme.colors.textSecondary,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  mediaTile: {
    borderRadius: theme.radius.md,
    height: 104,
    overflow: "hidden",
    position: "relative",
    width: 104,
  },
  mediaPreview: {
    height: "100%",
    width: "100%",
  },
  videoBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.sm,
    bottom: theme.spacing.xs,
    left: theme.spacing.xs,
    padding: 4,
    position: "absolute",
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 24,
  },
  addTile: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    width: 104,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
