import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../constants/theme";
import type { DocumentChecklistItem, VerificationDocumentType } from "../types/organizer";
import {
  canUploadChecklistItem,
  DOCUMENT_TYPE_LABELS,
  getChecklistItemDisplayStatus,
} from "../utils/organizer-verification";

type Props = {
  item: DocumentChecklistItem;
  reviewStatus: "DRAFT" | "CHANGES_REQUESTED" | "SUBMITTED" | "UNDER_REVIEW";
  isUploading: boolean;
  uploadError: string | null;
  disabled: boolean;
  onPickDocument: (documentType: VerificationDocumentType) => void;
  onPickSelfie: (source: "camera" | "library") => void;
};

export function OrganizerDocumentCard({
  item,
  reviewStatus,
  isUploading,
  uploadError,
  disabled,
  onPickDocument,
  onPickSelfie,
}: Props) {
  const canUpload = canUploadChecklistItem(item, reviewStatus);
  const statusLabel = getChecklistItemDisplayStatus(item);
  const versionLabel = item.latestVersion ? `Sürüm ${item.latestVersion}` : null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="sectionTitle">{DOCUMENT_TYPE_LABELS[item.documentType]}</AppText>
        <AppText variant="caption">{statusLabel}</AppText>
      </View>

      {versionLabel ? (
        <AppText variant="bodyMuted">{versionLabel}</AppText>
      ) : (
        <AppText variant="bodyMuted">Henüz yüklenmedi</AppText>
      )}

      {uploadError ? (
        <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
          {uploadError}
        </AppText>
      ) : null}

      {canUpload && reviewStatus !== "UNDER_REVIEW" ? (
        <View style={styles.actions}>
          {item.documentType === "SELFIE" ? (
            <>
              <AppButton
                accessibilityLabel={`${DOCUMENT_TYPE_LABELS.SELFIE} çek`}
                disabled={disabled || isUploading}
                label={isUploading ? "Yükleniyor..." : "Kamera ile Çek"}
                onPress={() => onPickSelfie("camera")}
              />
              <AppButton
                accessibilityLabel={`${DOCUMENT_TYPE_LABELS.SELFIE} galeriden seç`}
                disabled={disabled || isUploading}
                label="Galeriden Seç"
                onPress={() => onPickSelfie("library")}
                variant="secondary"
              />
            </>
          ) : (
            <AppButton
              accessibilityLabel={`${DOCUMENT_TYPE_LABELS[item.documentType]} ${item.latestDocumentId ? "yeniden yükle" : "seç ve yükle"}`}
              disabled={disabled || isUploading}
              label={
                isUploading
                  ? "Yükleniyor..."
                  : item.latestDocumentId
                    ? "Yeniden Yükle"
                    : "Seç ve Yükle"
              }
              onPress={() => onPickDocument(item.documentType)}
            />
          )}
          {isUploading ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <AppText variant="caption">Belge yükleniyor...</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
