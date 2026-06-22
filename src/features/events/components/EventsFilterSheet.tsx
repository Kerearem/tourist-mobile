import React, { useMemo } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  COMMUNITY_FILTERS,
  DATE_FILTERS,
  EVENT_TYPE_FILTERS,
  PRICE_FILTERS,
  type CommunityFilterOption,
  type DateFilterOption,
  type EventTypeFilterOption,
  type EventsFilterState,
  type PriceFilterOption,
} from "../types/filters";

type EventsFilterSheetProps = {
  visible: boolean;
  filters: EventsFilterState;
  onChange: (next: EventsFilterState) => void;
  onClose: () => void;
  onClearAll: () => void;
  onApply: () => void;
};

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <AppText style={[styles.chipLabel, active && styles.chipLabelActive]} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

const toggleItem = <T extends string>(items: T[], item: T): T[] => {
  if (items.includes(item)) {
    return items.filter((value) => value !== item);
  }
  return [...items, item];
};

export function EventsFilterSheet({ visible, filters, onChange, onClose, onClearAll, onApply }: EventsFilterSheetProps) {
  const selectedPreviewItems = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const dateLabel = DATE_FILTERS.find((item) => item.value === filters.date)?.label;
    if (dateLabel && filters.date) {
      items.push({ key: `date:${filters.date}`, label: dateLabel });
    }
    if (filters.price !== "any") {
      items.push({
        key: `price:${filters.price}`,
        label: PRICE_FILTERS.find((item) => item.value === filters.price)?.label ?? "",
      });
    }
    if (filters.community !== "all_communities") {
      items.push({ key: `community:${filters.community}`, label: "Topluluğum" });
    }
    items.push(
      ...filters.eventTypes.map((value) => ({
        key: `eventType:${value}`,
        label: EVENT_TYPE_FILTERS.find((item) => item.value === value)?.label ?? "",
      })),
    );
    return items.filter((item) => item.label);
  }, [filters]);

  const setDate = (value: DateFilterOption) => onChange({ ...filters, date: filters.date === value ? null : value });
  const setPrice = (value: PriceFilterOption) => onChange({ ...filters, price: value });
  const setCommunity = (value: CommunityFilterOption) => onChange({ ...filters, community: value });
  const toggleType = (value: EventTypeFilterOption) =>
    onChange({ ...filters, eventTypes: toggleItem(filters.eventTypes, value) });

  const removeSelectedItem = (key: string) => {
    const [group, value] = key.split(":");
    if (!value) {
      return;
    }
    if (group === "date") {
      onChange({ ...filters, date: null });
    } else if (group === "price") {
      onChange({ ...filters, price: "any" });
    } else if (group === "community") {
      onChange({ ...filters, community: "all_communities" });
    } else if (group === "eventType") {
      onChange({ ...filters, eventTypes: filters.eventTypes.filter((item) => item !== value) });
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={styles.backdropTapArea} />

        <SafeAreaView style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <AppText style={styles.title} variant="sectionTitle">
              Filtreler
            </AppText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={theme.colors.textPrimary} name="close" size={20} />
            </Pressable>
          </View>

          {selectedPreviewItems.length > 0 ? (
            <ScrollView contentContainerStyle={styles.selectedPreviewRow} horizontal showsHorizontalScrollIndicator={false}>
              {selectedPreviewItems.map((item) => (
                <Pressable key={item.key} onPress={() => removeSelectedItem(item.key)} style={styles.selectedPreviewChip}>
                  <AppText style={styles.selectedPreviewText} variant="caption">
                    {item.label}
                  </AppText>
                  <Ionicons color="#6B7280" name="close" size={14} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Tarih
              </AppText>
              <View style={styles.chipWrap}>
                {DATE_FILTERS.map((item) => (
                  <FilterChip active={filters.date === item.value} key={item.value} label={item.label} onPress={() => setDate(item.value)} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Fiyat
              </AppText>
              <View style={styles.chipWrap}>
                {PRICE_FILTERS.map((item) => (
                  <FilterChip active={filters.price === item.value} key={item.value} label={item.label} onPress={() => setPrice(item.value)} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Etkinlik Türü
              </AppText>
              <View style={styles.chipWrap}>
                {EVENT_TYPE_FILTERS.map((item) => (
                  <FilterChip
                    active={filters.eventTypes.includes(item.value)}
                    key={item.value}
                    label={item.label}
                    onPress={() => toggleType(item.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Topluluk
              </AppText>
              <View style={styles.chipWrap}>
                {COMMUNITY_FILTERS.map((item) => (
                  <FilterChip
                    active={filters.community === item.value}
                    key={item.value}
                    label={item.label}
                    onPress={() => setCommunity(item.value)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClearAll} style={styles.clearButton}>
              <AppText style={styles.clearText} variant="label">
                Temizle
              </AppText>
            </Pressable>
            <Pressable onPress={onApply} style={styles.applyButton}>
              <AppText style={styles.applyText} variant="label">
                Uygula
              </AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTapArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.md,
    width: 44,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 34,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  scrollContent: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  selectedPreviewRow: {
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  selectedPreviewChip: {
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  selectedPreviewText: {
    color: "#374151",
    fontWeight: "600",
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipLabel: {
    color: "#6B7280",
    fontWeight: "600",
  },
  chipLabelActive: {
    color: "#FFFFFF",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  clearText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  applyButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    flex: 1.2,
    justifyContent: "center",
    minHeight: 48,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
