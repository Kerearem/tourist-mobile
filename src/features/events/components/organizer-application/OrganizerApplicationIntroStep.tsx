import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../../components/ui/AppText";
import { Badge } from "../../../../components/ui/Badge";
import { Card } from "../../../../components/ui/Card";
import { theme } from "../../../../constants/theme";
import type { OrganizerApplicationType } from "../../types/organizer";
import { getIntroContent } from "../../utils/organizer-verification-wizard";

type Props = {
  applicationType: OrganizerApplicationType;
};

export function OrganizerApplicationIntroStep({ applicationType }: Props) {
  const content = getIntroContent(applicationType);

  return (
    <Card style={styles.card}>
      <AppText variant="title">{content.headline}</AppText>
      <View style={styles.badges}>
        <Badge label={applicationType === "BUSINESS" ? "İşletme başvurusu" : "Bireysel başvuru"} />
        <Badge label="Güvenli belge yükleme" />
      </View>
      <View style={styles.bullets}>
        {content.bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Ionicons color={theme.colors.primary} name="checkmark-circle" size={20} />
            <AppText style={styles.bulletText} variant="body">
              {bullet}
            </AppText>
          </View>
        ))}
      </View>
      <AppText style={styles.note} variant="bodyMuted">
        Başvurunu adım adım tamamlayacaksın. Taslak kaydedilir; istediğin zaman devam edebilirsin.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  bullets: {
    gap: theme.spacing.sm,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  bulletText: {
    flex: 1,
  },
  note: {
    color: theme.colors.textSecondary,
  },
});
