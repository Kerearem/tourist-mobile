import React from "react";
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { VerificationBadge } from "./VerificationBadge";
import { resolveVerificationBadge, type AccountType, type VerificationBadgeType } from "../../utils/verificationBadge";
import type { OrganizerStatus } from "../../models/user";

type VerifiedNameRowProps = {
  name: string;
  verificationBadge?: VerificationBadgeType | null;
  accountType?: AccountType | null;
  organizerStatus?: OrganizerStatus | null;
  isOrganizer?: boolean;
  badgeSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function VerifiedNameRow({
  name,
  verificationBadge,
  accountType,
  organizerStatus,
  isOrganizer,
  badgeSize = 16,
  style,
  textStyle,
  numberOfLines,
}: VerifiedNameRowProps) {
  const badge = resolveVerificationBadge({
    verificationBadge,
    accountType,
    organizerStatus,
    isOrganizer,
  });

  if (!badge) {
    return (
      <AppText numberOfLines={numberOfLines} style={textStyle}>
        {name}
      </AppText>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <AppText numberOfLines={numberOfLines} style={[styles.name, textStyle]}>
        {name}
      </AppText>
      <VerificationBadge size={badgeSize} type={badge} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%",
  },
  name: {
    flexShrink: 1,
  },
});
