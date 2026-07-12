import React, { useCallback, useEffect, useState } from "react";
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
import { ErrorState } from "../../../components/ui/ErrorState";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ExploreStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { getCreationTileSize } from "../../../services/media/mediaContentContracts";
import {
  pickUserContentMedia,
  type PickedUserContentMedia,
} from "../../../services/media/pickUserContentMedia";
import { uploadImage, uploadVideo } from "../../../services/media/cloudinary";
import { getMyOrganizerEvents } from "../../events/services/organizer.service";
import type { EventItem } from "../../events/types";
import { createOrganizerReel } from "../services/reels.service";
import { getReelsPublishBlockMessage } from "../services/reelsPublishing";

type Props = NativeStackScreenProps<
  ProfileStackParamList & ExploreStackParamList,
  "CreateReelScreen"
>;

type SelectedMedia = {
  id: string;
  uri: string;
  type: "IMAGE" | "VIDEO";
};

const MAX_MEDIA = 10;

export function CreateReelScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PickedUserContentMedia | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const organizerStatus = user?.organizerStatus;
  const publishAllowed = organizerStatus === "approved";
  const addTileSize = getCreationTileSize("reel");

  useEffect(() => {
    if (!publishAllowed) {
      setAccessError(getReelsPublishBlockMessage("not_organizer"));
      return;
    }

    setAccessError(null);
    let cancelled = false;

    void (async () => {
      setIsLoadingEvents(true);
      try {
        const organizerEvents = await getMyOrganizerEvents();
        if (!cancelled) {
          setEvents(organizerEvents);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEvents(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publishAllowed]);

  const pickMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      setError(`En fazla ${MAX_MEDIA} medya seçebilirsin.`);
      return;
    }

    try {
      const picked = await pickUserContentMedia("reel");
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

  const moveMedia = useCallback((index: number, direction: -1 | 1) => {
    setMedia((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }, []);

  const submitReel = async () => {
    if (media.length === 0 || isSubmitting || !publishAllowed) {
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
            ? await uploadVideo(item.uri, { folder: "organizer/reels" })
            : await uploadImage(item.uri, { folder: "organizer/reels" });

        uploadedMedia.push({
          url,
          type: item.type,
          order: index,
        });
      }

      await createOrganizerReel({
        caption: caption.trim() || undefined,
        eventId: selectedEventId ?? undefined,
        media: uploadedMedia,
      });

      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Tanıtım içeriği paylaşılamadı.");
    } finally {
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };

  if (accessError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Tanıtım Ekle" />
        </View>
        <View style={styles.centerState}>
          <ErrorState subtitle={accessError} title="Erişim yok" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Tanıtım Ekle" />

        <AppText style={styles.hint} variant="bodyMuted">
          Profiline 1-10 fotoğraf veya video ekle. Her medya için önizleme gösterilir; sırayı ok tuşlarıyla
          düzenleyebilirsin.
        </AppText>

        <View style={styles.mediaGrid}>
          {media.map((item, index) => (
            <CreationMediaTile
              key={item.id}
              footer={
                <View style={styles.reorderRow}>
                  <Pressable
                    disabled={index === 0}
                    onPress={() => moveMedia(index, -1)}
                    style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                  >
                    <Ionicons color="#FFFFFF" name="chevron-back" size={14} />
                  </Pressable>
                  <Pressable
                    disabled={index === media.length - 1}
                    onPress={() => moveMedia(index, 1)}
                    style={[styles.reorderButton, index === media.length - 1 && styles.reorderButtonDisabled]}
                  >
                    <Ionicons color="#FFFFFF" name="chevron-forward" size={14} />
                  </Pressable>
                </View>
              }
              kind="reel"
              onRemove={() => removeMedia(item.id)}
              orderLabel={String(index + 1)}
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
          placeholder="Etkinliğini veya markanı tanıt..."
          value={caption}
        />

        <View style={styles.eventSection}>
          <AppText variant="label">Etkinlik etiketi (opsiyonel)</AppText>
          {isLoadingEvents ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventChipRow}>
              <Pressable
                onPress={() => setSelectedEventId(null)}
                style={[styles.eventChip, selectedEventId === null && styles.eventChipActive]}
              >
                <AppText
                  style={[styles.eventChipText, selectedEventId === null && styles.eventChipTextActive]}
                  variant="caption"
                >
                  Etiket yok
                </AppText>
              </Pressable>
              {events.map((event) => {
                const isSelected = selectedEventId === event.id;
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => setSelectedEventId(event.id)}
                    style={[styles.eventChip, isSelected && styles.eventChipActive]}
                  >
                    <AppText
                      numberOfLines={1}
                      style={[styles.eventChipText, isSelected && styles.eventChipTextActive]}
                      variant="caption"
                    >
                      {event.title}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

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
          label="Tanıtımı paylaş"
          loading={isSubmitting}
          onPress={() => void submitReel()}
        />
      </ScrollView>

      <MediaUploadPreviewModal
        kind="reel"
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
  pagePadding: {
    paddingHorizontal: theme.spacing.lg,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
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
  reorderRow: {
    bottom: 4,
    flexDirection: "row",
    gap: 4,
    position: "absolute",
    right: 4,
  },
  reorderButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  reorderButtonDisabled: {
    opacity: 0.35,
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
  eventSection: {
    gap: theme.spacing.sm,
  },
  eventChipRow: {
    flexGrow: 0,
  },
  eventChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginRight: theme.spacing.sm,
    maxWidth: 200,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  eventChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  eventChipText: {
    color: theme.colors.textPrimary,
  },
  eventChipTextActive: {
    color: "#FFFFFF",
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
