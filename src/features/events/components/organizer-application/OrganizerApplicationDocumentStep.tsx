import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../../components/ui/AppButton";
import { AppText } from "../../../../components/ui/AppText";
import { Card } from "../../../../components/ui/Card";
import { theme } from "../../../../constants/theme";
import type { DocumentChecklistItem, VerificationDocumentType } from "../../types/organizer";
import {
  canUploadChecklistItem,
  getChecklistItemDisplayStatus,
  isChecklistItemComplete,
} from "../../utils/organizer-verification";
import { getDocumentCaptureActions } from "../../utils/organizer-verification-capture";
import { getDocumentStepGuidance } from "../../utils/organizer-verification-wizard";

type Props = {
  documentType: VerificationDocumentType;
  item: DocumentChecklistItem | undefined;
  reviewStatus: "DRAFT" | "CHANGES_REQUESTED" | "SUBMITTED" | "UNDER_REVIEW";
  isUploading: boolean;
  uploadError: string | null;
  disabled: boolean;
  onOpenGuidedCamera: (documentType: VerificationDocumentType) => void;
  onPickGallery: (documentType: VerificationDocumentType) => void;
  onPickFile: (documentType: VerificationDocumentType) => void;
};

export function OrganizerApplicationDocumentStep({
  documentType,
  item,
  reviewStatus,
  isUploading,
  uploadError,
  disabled,
  onOpenGuidedCamera,
  onPickGallery,
  onPickFile,
}: Props) {
  const guidance = getDocumentStepGuidance(documentType);
  const actions = getDocumentCaptureActions(documentType);
  const checklistItem = item ?? {
    documentType,
    required: true,
    latestDocumentId: null,
    latestStatus: null,
    latestVersion: null,
    satisfied: false,
  };
  const canUpload = canUploadChecklistItem(checklistItem, reviewStatus);
  const statusLabel = getChecklistItemDisplayStatus(checklistItem);
  const isUploaded = isChecklistItemComplete(checklistItem);

  const handleAction = (kind: (typeof actions)[number]["kind"]) => {
    if (kind === "guided_camera") {
      onOpenGuidedCamera(documentType);
      return;
    }

    if (kind === "gallery") {
      onPickGallery(documentType);
      return;
    }

    onPickFile(documentType);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="sectionTitle">{guidance.title}</AppText>
        {isUploaded ? (
          <View style={styles.uploadedBadge}>
            <Ionicons color="#047857" name="checkmark-circle" size={18} />
            <AppText style={styles.uploadedText} variant="caption">
              Yüklendi
            </AppText>
          </View>
        ) : (
          <AppText style={styles.statusText} variant="caption">
            {statusLabel}
          </AppText>
        )}
      </View>

      <View style={styles.infoBlock}>
        <AppText style={styles.infoLabel} variant="label">
          Neden istiyoruz?
        </AppText>
        <AppText variant="bodyMuted">{guidance.why}</AppText>
      </View>

      <View style={styles.metaRow}>
        <AppText variant="caption">Format: {guidance.formats}</AppText>
        <AppText variant="caption">{guidance.maxSize}</AppText>
      </View>

      {checklistItem.latestVersion ? (
        <AppText variant="bodyMuted">Sürüm {checklistItem.latestVersion}</AppText>
      ) : null}

      {uploadError ? (
        <AppText accessibilityRole="alert" style={styles.errorText} variant="caption">
          {uploadError}
        </AppText>
      ) : null}

      {canUpload && reviewStatus !== "UNDER_REVIEW" ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <AppButton
              key={action.kind}
              accessibilityLabel={`${guidance.title} ${action.label.toLowerCase()}`}
              disabled={disabled || isUploading}
              label={isUploading && action.primary ? "Yükleniyor..." : action.label}
              onPress={() => handleAction(action.kind)}
              variant={action.primary ? "primary" : "secondary"}
            />
          ))}
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
    gap: theme.spacing.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  uploadedBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  uploadedText: {
    color: "#047857",
    fontWeight: "600",
  },
  statusText: {
    color: theme.colors.textSecondary,
  },
  infoBlock: {
    gap: theme.spacing.xs,
  },
  infoLabel: {
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: {
    gap: theme.spacing.sm,
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
