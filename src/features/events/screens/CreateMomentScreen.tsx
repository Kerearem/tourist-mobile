import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { CreationMediaTile } from "../../../components/media/CreationMediaTile";
import { MediaUploadPreviewModal } from "../../../components/media/MediaUploadPreviewModal";
import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { getCreationTileSize } from "../../../services/media/mediaContentContracts";
import {
  pickUserContentMedia,
  type PickedUserContentMedia,
} from "../../../services/media/pickUserContentMedia";
import { uploadImage, uploadVideo } from "../../../services/media/cloudinary";
import { createEventMoment } from "../services/events.service";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";

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
  const [previewMedia, setPreviewMedia] = useState<PickedUserContentMedia | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const addTileSize = getCreationTileSize("moment");

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      setError(`En fazla ${MAX_MEDIA} medya seçebilirsin.`);
      return;
    }

    try {
      const picked = await pickUserContentMedia("moment");
      if (!picked) {
        return;
      }
      setPreviewMedia(picked);
      setIsPreviewVisible(true);
      setError(null);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : "Medya seçilemedi.");
    }
  };

  const confirmPreview = () => {
    if (!previewMedia) {
      return;
    }

    setMedia((current) =>
      [
        ...current,
        {
          id: `${previewMedia.uri}_${Date.now()}_${Math.random()}`,
          uri: previewMedia.uri,
          type: previewMedia.type,
        },
      ].slice(0, MAX_MEDIA),
    );
    setPreviewMedia(null);
    setIsPreviewVisible(false);
  };

  const retakePreview = () => {
    setIsPreviewVisible(false);
    setPreviewMedia(null);
    void pickMedia();
  };

  const cancelPreview = () => {
    setIsPreviewVisible(false);
    setPreviewMedia(null);
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
          Etkinlikten 1-10 fotoğraf veya video seç. Her medya için önizleme gösterilir.
        </AppText>

        <View style={styles.mediaGrid}>
          {media.map((item) => (
            <CreationMediaTile
              key={item.id}
              kind="moment"
              onRemove={() => removeMedia(item.id)}
              type={item.type}
              uri={item.uri}
            />
          ))}

          {media.length < MAX_MEDIA ? (
            <Pressable
              disabled={isSubmitting}
              onPress={() => void pickMedia()}
              style={[styles.addTile, { height: addTileSize.height, width: addTileSize.width }]}
            >
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

      <MediaUploadPreviewModal
        kind="moment"
        media={previewMedia}
        onCancel={cancelPreview}
        onConfirm={confirmPreview}
        onRetake={retakePreview}
        visible={isPreviewVisible}
      />
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
  addTile: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
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
