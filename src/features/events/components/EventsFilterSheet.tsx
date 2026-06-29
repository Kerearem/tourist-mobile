import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  ALCOHOL_FILTERS,
  COMMUNITY_FILTERS,
  DATE_FILTERS,
  EVENT_TYPE_FILTERS,
  PRICE_FILTERS,
  SMOKING_FILTERS,
  type AlcoholFilterOption,
  type CommunityFilterOption,
  type DateFilterOption,
  type EventTypeFilterOption,
  type EventsFilterState,
  type PriceFilterOption,
  type SmokingFilterOption,
} from "../types/filters";
import {
  EVENT_FILTER_APPLY_RED,
  EVENT_FILTER_RED,
  EVENT_FILTER_RED_BORDER,
  EVENTS_SHEET_EDGE,
} from "../constants/eventFilterTheme";

type EventsFilterSheetProps = {
  visible: boolean;
  filters: EventsFilterState;
  onChange: (next: EventsFilterState) => void;
  onClose: () => void;
  onClearAll: () => void;
  onApply: () => void;
  showAlcoholAndSmokingFilters: boolean;
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

export function EventsFilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  onClearAll,
  onApply,
  showAlcoholAndSmokingFilters,
}: EventsFilterSheetProps) {
  const setDate = (value: DateFilterOption) => onChange({ ...filters, date: filters.date === value ? null : value });
  const setPrice = (value: PriceFilterOption) => onChange({ ...filters, price: value });
  const setCommunity = (value: CommunityFilterOption) => onChange({ ...filters, community: value });
  const setAlcohol = (value: AlcoholFilterOption) => onChange({ ...filters, alcohol: value });
  const setSmoking = (value: SmokingFilterOption) => onChange({ ...filters, smoking: value });
  const toggleType = (value: EventTypeFilterOption) =>
    onChange({ ...filters, eventTypes: toggleItem(filters.eventTypes, value) });

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={styles.backdropTapArea} />

        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <AppText style={styles.title} variant="sectionTitle">
                Filtreler
              </AppText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons color={theme.colors.textPrimary} name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <AppText style={styles.sectionTitle} variant="label">
                  Tarih
                </AppText>
                <ScrollView
                  contentContainerStyle={styles.horizontalChipRow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}
                >
                  {DATE_FILTERS.map((item) => (
                    <FilterChip
                      active={filters.date === item.value}
                      key={item.value}
                      label={item.label}
                      onPress={() => setDate(item.value)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.section}>
                <AppText style={styles.sectionTitle} variant="label">
                  Fiyat
                </AppText>
                <View style={styles.chipWrap}>
                  {PRICE_FILTERS.map((item) => (
                    <FilterChip
                      active={filters.price === item.value}
                      key={item.value}
                      label={item.label}
                      onPress={() => setPrice(item.value)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <AppText style={styles.sectionTitle} variant="label">
                  Etkinlik Türü
                </AppText>
                <View style={styles.horizontalScrollHost}>
                  <ScrollView
                    contentContainerStyle={styles.horizontalChipRow}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalScroll}
                  >
                    {EVENT_TYPE_FILTERS.map((item) => (
                      <FilterChip
                        active={filters.eventTypes.includes(item.value)}
                        key={item.value}
                        label={item.label}
                        onPress={() => toggleType(item.value)}
                      />
                    ))}
                  </ScrollView>
                </View>
              </View>

              {showAlcoholAndSmokingFilters ? (
                <>
                  <View style={styles.section}>
                    <AppText style={styles.sectionTitle} variant="label">
                      Alkol
                    </AppText>
                    <View style={styles.chipWrap}>
                      {ALCOHOL_FILTERS.map((item) => (
                        <FilterChip
                          active={filters.alcohol === item.value}
                          key={item.value}
                          label={item.label}
                          onPress={() => setAlcohol(item.value)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <AppText style={styles.sectionTitle} variant="label">
                      Sigara
                    </AppText>
                    <View style={styles.chipWrap}>
                      {SMOKING_FILTERS.map((item) => (
                        <FilterChip
                          active={filters.smoking === item.value}
                          key={item.value}
                          label={item.label}
                          onPress={() => setSmoking(item.value)}
                        />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

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
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetContent: {
    paddingHorizontal: EVENTS_SHEET_EDGE,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D1D5DB",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    width: 44,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
  },
  headerSpacer: {
    width: 34,
  },
  title: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  scrollContent: {
    gap: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    paddingLeft: 2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    paddingRight: 2,
  },
  horizontalScrollHost: {
    marginHorizontal: -EVENTS_SHEET_EDGE,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  horizontalChipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: EVENTS_SHEET_EDGE,
    paddingRight: EVENTS_SHEET_EDGE + theme.spacing.md,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderColor: EVENT_FILTER_RED_BORDER,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 11,
  },
  chipActive: {
    backgroundColor: EVENT_FILTER_RED,
    borderColor: EVENT_FILTER_RED,
  },
  chipLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  clearText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  applyButton: {
    alignItems: "center",
    backgroundColor: EVENT_FILTER_APPLY_RED,
    borderRadius: 14,
    flex: 1.2,
    justifyContent: "center",
    minHeight: 50,
  },
  applyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
