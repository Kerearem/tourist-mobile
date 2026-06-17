import React, { useMemo } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  ATTENDANCE_FILTERS,
  COMMUNITY_FILTERS,
  DATE_FILTERS,
  DISTANCE_FILTERS,
  EVENT_TYPE_FILTERS,
  PRICE_FILTERS,
  VIBE_FILTERS,
  type AttendanceFilterOption,
  type CommunityFilterOption,
  type DateFilterOption,
  type DistanceFilterOption,
  type EventTypeFilterOption,
  type EventsFilterState,
  type PriceFilterOption,
  type VibeFilterOption,
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

const toggleItem = <T extends string,>(items: T[], item: T): T[] => {
  if (items.includes(item)) {
    return items.filter((value) => value !== item);
  }
  return [...items, item];
};

export function EventsFilterSheet({ visible, filters, onChange, onClose, onClearAll, onApply }: EventsFilterSheetProps) {
  const selectedPreviewItems = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const dateLabel = DATE_FILTERS.find((item) => item.value === filters.date)?.label;
    if (dateLabel && filters.date) items.push({ key: `date:${filters.date}`, label: dateLabel });
    if (filters.price !== "any") {
      items.push({ key: `price:${filters.price}`, label: PRICE_FILTERS.find((item) => item.value === filters.price)?.label ?? "" });
    }
    if (filters.community !== "all_communities") items.push({ key: `community:${filters.community}`, label: "My community only" });
    if (filters.distance !== "anywhere_city") {
      items.push({
        key: `distance:${filters.distance}`,
        label: DISTANCE_FILTERS.find((item) => item.value === filters.distance)?.label ?? "",
      });
    }
    items.push(
      ...filters.eventTypes.map((value) => ({ key: `eventType:${value}`, label: EVENT_TYPE_FILTERS.find((item) => item.value === value)?.label ?? "" })),
    );
    items.push(...filters.vibe.map((value) => ({ key: `vibe:${value}`, label: VIBE_FILTERS.find((item) => item.value === value)?.label ?? "" })));
    items.push(
      ...filters.attendance.map((value) => ({
        key: `attendance:${value}`,
        label: ATTENDANCE_FILTERS.find((item) => item.value === value)?.label ?? "",
      })),
    );
    return items.filter((item) => item.label);
  }, [filters]);

  const setDate = (value: DateFilterOption) => onChange({ ...filters, date: filters.date === value ? null : value });
  const setPrice = (value: PriceFilterOption) => onChange({ ...filters, price: value });
  const setCommunity = (value: CommunityFilterOption) => onChange({ ...filters, community: value });
  const setDistance = (value: DistanceFilterOption) => onChange({ ...filters, distance: value });
  const toggleType = (value: EventTypeFilterOption) => onChange({ ...filters, eventTypes: toggleItem(filters.eventTypes, value) });
  const toggleVibe = (value: VibeFilterOption) => onChange({ ...filters, vibe: toggleItem(filters.vibe, value) });
  const toggleAttendance = (value: AttendanceFilterOption) =>
    onChange({ ...filters, attendance: toggleItem(filters.attendance, value) });
  const removeSelectedItem = (key: string) => {
    const [group, value] = key.split(":");
    if (!value) return;
    if (group === "date") onChange({ ...filters, date: null });
    else if (group === "price") onChange({ ...filters, price: "any" });
    else if (group === "community") onChange({ ...filters, community: "all_communities" });
    else if (group === "distance") onChange({ ...filters, distance: "anywhere_city" });
    else if (group === "eventType") onChange({ ...filters, eventTypes: filters.eventTypes.filter((item) => item !== value) });
    else if (group === "vibe") onChange({ ...filters, vibe: filters.vibe.filter((item) => item !== value) });
    else if (group === "attendance") onChange({ ...filters, attendance: filters.attendance.filter((item) => item !== value) });
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
              Filters
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
                Date
              </AppText>
              <View style={styles.chipWrap}>
                {DATE_FILTERS.map((item) => (
                  <FilterChip active={filters.date === item.value} key={item.value} label={item.label} onPress={() => setDate(item.value)} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Price
              </AppText>
              <View style={styles.chipWrap}>
                {PRICE_FILTERS.map((item) => (
                  <FilterChip active={filters.price === item.value} key={item.value} label={item.label} onPress={() => setPrice(item.value)} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Event type
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
                Community
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

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Distance
              </AppText>
              <View style={styles.chipWrap}>
                {DISTANCE_FILTERS.map((item) => (
                  <FilterChip
                    active={filters.distance === item.value}
                    key={item.value}
                    label={item.label}
                    onPress={() => setDistance(item.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Vibe
              </AppText>
              <View style={styles.chipWrap}>
                {VIBE_FILTERS.map((item) => (
                  <FilterChip active={filters.vibe.includes(item.value)} key={item.value} label={item.label} onPress={() => toggleVibe(item.value)} />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle} variant="label">
                Attendance
              </AppText>
              <View style={styles.chipWrap}>
                {ATTENDANCE_FILTERS.map((item) => (
                  <FilterChip
                    active={filters.attendance.includes(item.value)}
                    key={item.value}
                    label={item.label}
                    onPress={() => toggleAttendance(item.value)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClearAll} style={styles.clearButton}>
              <AppText style={styles.clearText} variant="label">
                Clear all
              </AppText>
            </Pressable>
            <Pressable onPress={onApply} style={styles.applyButton}>
              <AppText style={styles.applyText} variant="label">
                Show 24 events
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
    paddingHorizontal: theme.spacing.md,
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
    paddingHorizontal: theme.spacing.xs,
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
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  selectedPreviewRow: {
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: 2,
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
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 9,
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
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
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
    minHeight: 42,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
