import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MediaUploadPreviewModal } from "../../../../../components/media/MediaUploadPreviewModal";
import { AppInput } from "../../../../../components/ui/AppInput";
import { AppText } from "../../../../../components/ui/AppText";
import { theme } from "../../../../../constants/theme";
import { getDisplayResizeMode } from "../../../../../services/media/mediaContentContracts";
import {
  pickEventCoverImage,
  type PickedUserContentMedia,
} from "../../../../../services/media/pickUserContentMedia";
import { EVENT_TYPES, type EventType } from "../../../constants/eventTypes";
import type { EventCreationDraft, EventCreationFieldErrors } from "../../../types/eventCreation";
import { FieldError, SELECTED_BG, SELECTED_BORDER, StepSection, errorBorder, inputFieldStyle, FIELD_RADIUS } from "../createEventUi";

type BasicsStepProps = {
  draft: EventCreationDraft;
  errors: EventCreationFieldErrors;
  onChange: (patch: Partial<EventCreationDraft>) => void;
  onClearError: (key: keyof EventCreationFieldErrors) => void;
};

export function BasicsStep({ draft, errors, onChange, onClearError }: BasicsStepProps) {
  const [previewMedia, setPreviewMedia] = useState<PickedUserContentMedia | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const coverResizeMode = getDisplayResizeMode("eventCover");

  const pickCoverImage = async () => {
    try {
      const picked = await pickEventCoverImage();
      if (!picked) {
        return;
      }
      setPreviewMedia(picked);
      setIsPreviewVisible(true);
    } catch (error) {
      Alert.alert("İzin gerekli", error instanceof Error ? error.message : "Kapak fotoğrafı seçilemedi.");
    }
  };

  const confirmCover = () => {
    if (previewMedia) {
      onChange({ coverUri: previewMedia.uri });
    }
    setPreviewMedia(null);
    setIsPreviewVisible(false);
  };

  const retakeCover = () => {
    setIsPreviewVisible(false);
    setPreviewMedia(null);
    void pickCoverImage();
  };

  const cancelCoverPreview = () => {
    setIsPreviewVisible(false);
    setPreviewMedia(null);
  };

  return (
    <StepSection>
      <View style={styles.fieldBlock}>
        <AppText variant="label">Etkinlik Türü</AppText>
        <AppText variant="caption">Etkinliğinin ana temasını seç</AppText>
        <View style={[styles.typeList, errorBorder(Boolean(errors.eventType))]}>
          {EVENT_TYPES.map((item) => {
            const active = draft.eventType === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  onChange({ eventType: item.value as EventType });
                  onClearError("eventType");
                }}
                style={[styles.typeCard, active && styles.typeCardActive]}
              >
                <AppText style={styles.typeEmoji}>{item.emoji}</AppText>
                <View style={styles.typeTextWrap}>
                  <AppText style={[styles.typeLabel, active && styles.typeLabelActive]} variant="label">
                    {item.label}
                  </AppText>
                </View>
                {active ? <Ionicons color={SELECTED_BORDER} name="checkmark-circle" size={22} /> : null}
              </Pressable>
            );
          })}
        </View>
        <FieldError message={errors.eventType} />
      </View>

      <View style={styles.card}>
        <AppInput
          error={errors.title}
          label="Etkinlik Adı"
          onChangeText={(value) => {
            onChange({ title: value });
            onClearError("title");
          }}
          placeholder="Berlin Türk Kahvesi Buluşması"
          style={inputFieldStyle}
          value={draft.title}
        />
        <AppInput
          error={errors.description}
          label="Açıklama"
          multiline
          numberOfLines={5}
          onChangeText={(value) => {
            onChange({ description: value });
            onClearError("description");
          }}
          placeholder="Katılımcılar ne beklemeli, kimler katılmalı?"
          style={[inputFieldStyle, styles.textarea]}
          textAlignVertical="top"
          value={draft.description}
        />
      </View>

      <View style={styles.fieldBlock}>
        <AppText variant="label">Kapak Fotoğrafı</AppText>
        <AppText variant="caption">Opsiyonel · 16:9 kırpma ve önizleme sonrası yüklenir</AppText>
        {draft.coverUri ? (
          <Image resizeMode={coverResizeMode} source={{ uri: draft.coverUri }} style={styles.coverPreview} />
        ) : (
          <Pressable onPress={() => void pickCoverImage()} style={styles.coverUpload}>
            <Ionicons color={theme.colors.muted} name="cloud-upload-outline" size={32} />
            <AppText style={styles.uploadText} variant="bodyMuted">
              16:9 kapak fotoğrafı ekle
            </AppText>
          </Pressable>
        )}
        <Pressable onPress={() => void pickCoverImage()} style={styles.changePhotoButton}>
          <AppText style={styles.changePhotoText} variant="label">
            {draft.coverUri ? "Fotoğrafı Değiştir" : "Fotoğraf Seç"}
          </AppText>
        </Pressable>
      </View>

      <MediaUploadPreviewModal
        kind="eventCover"
        media={previewMedia}
        onCancel={cancelCoverPreview}
        onConfirm={confirmCover}
        onRetake={retakeCover}
        visible={isPreviewVisible}
      />
    </StepSection>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  textarea: {
    minHeight: 120,
  },
  typeList: {
    borderColor: "transparent",
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: 2,
  },
  typeCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 72,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  typeCardActive: {
    backgroundColor: SELECTED_BG,
    borderColor: SELECTED_BORDER,
  },
  typeEmoji: {
    fontSize: 28,
  },
  typeTextWrap: {
    flex: 1,
  },
  typeLabel: {
    color: theme.colors.textPrimary,
  },
  typeLabelActive: {
    color: SELECTED_BORDER,
  },
  coverPreview: {
    aspectRatio: 16 / 9,
    borderRadius: FIELD_RADIUS,
    width: "100%",
  },
  coverUpload: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderStyle: "dashed",
    borderWidth: 2,
    gap: theme.spacing.sm,
    justifyContent: "center",
    width: "100%",
  },
  uploadText: {
    textAlign: "center",
  },
  changePhotoButton: {
    alignSelf: "flex-start",
  },
  changePhotoText: {
    color: theme.colors.primary,
  },
});
