import React, { useMemo } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { getCountryByCode, getCountryLabel } from "../../../constants/countries";
import { theme } from "../../../constants/theme";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { formatEventTicketOfferingLabel } from "../utils/eventTicketPricing";
import { formatWallClockInTimezone, isValidIanaTimezone, wallClockFromDate } from "../utils/eventTimezone";
import type { OrganizerEventSubmissionSnapshot } from "../utils/organizerCreatedEventNavigation";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "OrganizerEventSubmissionScreen"
>;

const formatMinAgeLabel = (minAge?: number | null) => {
  if (minAge === 18) {
    return "18 yaş ve üzeri";
  }
  if (minAge === 21) {
    return "21 yaş ve üzeri";
  }
  return "Genel (16+)";
};

const formatStatusLabel = (status: string) => {
  if (status === "PENDING_REVIEW") return "İncelemede";
  if (status === "REJECTED") return "Reddedildi";
  if (status === "CANCELLED") return "İptal";
  if (status === "DRAFT") return "Taslak";
  return status || "Bilinmiyor";
};

const formatVisibilityLabel = (visibility?: string) => {
  if (visibility === "city") return "Şehir";
  if (visibility === "country") return "Ülke";
  if (visibility === "private") return "Özel";
  return visibility ?? "—";
};

const formatDateTime = (event: OrganizerEventSubmissionSnapshot, isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  if (event.timezone && isValidIanaTimezone(event.timezone)) {
    return formatWallClockInTimezone(wallClockFromDate(date), event.timezone);
  }

  return date.toLocaleString("tr-TR");
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText style={styles.detailLabel} variant="caption">
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export function OrganizerEventSubmissionScreen({ navigation, route }: Props) {
  const event = route.params.event;

  const locationLabel = useMemo(() => {
    const country = getCountryByCode(event.countryCode);
    const countryName = country ? getCountryLabel(country, "tr") : event.countryCode;
    const venue = event.venueName?.trim();
    if (venue) {
      return `${venue}, ${event.city}, ${countryName}`;
    }
    return `${event.city}, ${countryName}`;
  }, [event.city, event.countryCode, event.venueName]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Gönderimi" />
        <View style={styles.statusRow}>
          <Badge label={formatStatusLabel(event.status)} />
          <AppText muted variant="caption">
            Bu etkinlik henüz herkese açık değil.
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {event.coverImageUrl ? (
          <Image source={{ uri: event.coverImageUrl }} style={styles.cover} />
        ) : null}

        <Card style={styles.card}>
          <AppText variant="sectionTitle">{event.title}</AppText>
          <AppText style={styles.description} variant="bodyMuted">
            {event.description}
          </AppText>
        </Card>

        <Card style={styles.card}>
          <DetailRow label="Başlangıç" value={formatDateTime(event, event.startsAt)} />
          {event.endsAt ? <DetailRow label="Bitiş" value={formatDateTime(event, event.endsAt)} /> : null}
          <DetailRow label="Konum" value={locationLabel} />
          {event.timezone ? <DetailRow label="Saat dilimi" value={event.timezone} /> : null}
          <DetailRow label="Görünürlük" value={formatVisibilityLabel(event.visibility)} />
        </Card>

        <Card style={styles.card}>
          <DetailRow
            label="Kapasite"
            value={event.capacity != null ? String(event.capacity) : "—"}
          />
          <DetailRow label="Yaş sınırı" value={formatMinAgeLabel(event.minAge)} />
          <DetailRow label="Alkol" value={event.hasAlcohol ? "Var" : "Yok"} />
          <DetailRow label="Sigara" value={event.smokingAllowed ? "İzinli" : "Yasak"} />
          <DetailRow
            label="Bilet"
            value={formatEventTicketOfferingLabel({ tokenPrice: event.tokenPrice })}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  pagePadding: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  cover: {
    borderRadius: theme.radius.md,
    height: 180,
    width: "100%",
  },
  card: {
    gap: theme.spacing.sm,
  },
  description: {
    marginTop: theme.spacing.xs,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    color: theme.colors.textSecondary,
  },
});
