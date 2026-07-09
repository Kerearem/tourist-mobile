import React from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../../components/ui/AppButton";
import { AppText } from "../../../../components/ui/AppText";
import { Card } from "../../../../components/ui/Card";
import { theme } from "../../../../constants/theme";
import type { DocumentChecklistItem, VerificationDocumentType } from "../../types/organizer";
import { OrganizerDocumentCard } from "../OrganizerDocumentCard";
import { toDocumentCardReviewStatus } from "../../utils/organizer-verification";

type Props = {
  title: string;
  message: string;
  changeRequestReason?: string | null;
  checklist: DocumentChecklistItem[];
  reviewStatus: "DRAFT" | "CHANGES_REQUESTED" | "SUBMITTED" | "UNDER_REVIEW";
  readOnly?: boolean;
  onBack: () => void;
  activeUploadType?: VerificationDocumentType | null;
  uploadErrors?: Partial<Record<VerificationDocumentType, string>>;
  onPickDocument?: (documentType: VerificationDocumentType) => void;
  onPickSelfie?: (source: "camera" | "library") => void;
};

export function OrganizerApplicationStatusCard({
  title,
  message,
  changeRequestReason,
  checklist,
  reviewStatus,
  readOnly = true,
  onBack,
  activeUploadType = null,
  uploadErrors = {},
  onPickDocument,
  onPickSelfie,
}: Props) {
  return (
    <View style={styles.container}>
      {changeRequestReason ? (
        <Card style={styles.warningCard}>
          <AppText variant="sectionTitle">Düzeltme İstendi</AppText>
          <AppText variant="body">{changeRequestReason}</AppText>
        </Card>
      ) : null}

      <Card style={styles.infoCard}>
        <AppText variant="sectionTitle">{title}</AppText>
        <AppText variant="body">{message}</AppText>
      </Card>

      {checklist.map((item) => (
        <OrganizerDocumentCard
          key={item.documentType}
          disabled={readOnly || (activeUploadType !== null && activeUploadType !== item.documentType)}
          isUploading={activeUploadType === item.documentType}
          item={item}
          onPickDocument={onPickDocument ?? (() => undefined)}
          onPickSelfie={onPickSelfie ?? (() => undefined)}
          reviewStatus={toDocumentCardReviewStatus(reviewStatus)}
          uploadError={uploadErrors[item.documentType] ?? null}
        />
      ))}

      <AppButton label="Geri Dön" onPress={onBack} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    gap: theme.spacing.xs,
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    gap: theme.spacing.sm,
  },
});
