import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../../components/ui/AppText";
import { Card } from "../../../../components/ui/Card";
import { theme } from "../../../../constants/theme";
import type { DocumentChecklistItem } from "../../types/organizer";
import {
  DOCUMENT_TYPE_LABELS,
  getChecklistItemDisplayStatus,
  isChecklistItemComplete,
} from "../../utils/organizer-verification";

type Props = {
  motivation: string;
  checklist: DocumentChecklistItem[];
  submitReady: boolean;
  isResubmit: boolean;
  onEditMotivation?: () => void;
};

export function OrganizerApplicationReviewStep({
  motivation,
  checklist,
  submitReady,
  isResubmit,
  onEditMotivation,
}: Props) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <AppText variant="sectionTitle">Motivasyon</AppText>
          {onEditMotivation ? (
            <AppText onPress={onEditMotivation} style={styles.editLink} variant="caption">
              Düzenle
            </AppText>
          ) : null}
        </View>
        <AppText variant="body">{motivation.trim() || "—"}</AppText>
      </Card>

      <Card style={styles.card}>
        <AppText variant="sectionTitle">Belge özeti</AppText>
        <AppText variant="bodyMuted">
          {submitReady
            ? isResubmit
              ? "Düzeltilen belgelerle başvurunu yeniden gönderebilirsin."
              : "Tüm zorunlu belgeler yüklendi. Başvurunu gönderebilirsin."
            : isResubmit
              ? "Yeniden göndermek için reddedilen veya eksik belgeleri tamamla."
              : "Göndermek için tüm zorunlu belgelerin yüklenmiş olması gerekir."}
        </AppText>

        <View style={styles.checklist}>
          {checklist.map((item) => {
            const complete = isChecklistItemComplete(item);

            return (
              <View key={item.documentType} style={styles.checklistRow}>
                <Ionicons
                  color={complete ? "#047857" : theme.colors.muted}
                  name={complete ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                />
                <View style={styles.checklistText}>
                  <AppText variant="body">{DOCUMENT_TYPE_LABELS[item.documentType]}</AppText>
                  <AppText style={styles.checklistStatus} variant="caption">
                    {getChecklistItemDisplayStatus(item)}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editLink: {
    color: theme.colors.primary,
  },
  checklist: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  checklistRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  checklistText: {
    flex: 1,
    gap: 2,
  },
  checklistStatus: {
    color: theme.colors.textSecondary,
  },
});
