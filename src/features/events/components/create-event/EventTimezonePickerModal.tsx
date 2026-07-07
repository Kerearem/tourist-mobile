import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../../components/ui/AppText";
import { theme } from "../../../../constants/theme";
import {
  buildTimezoneOptions,
  formatTimezoneOptionLabel,
  searchTimezoneOptions,
  type TimezoneOption,
} from "../../utils/eventTimezone";
import { FIELD_RADIUS } from "./createEventUi";

type EventTimezonePickerModalProps = {
  visible: boolean;
  selectedTimezone: string;
  onClose: () => void;
  onSelect: (timezone: string) => void;
};

export function EventTimezonePickerModal({
  visible,
  selectedTimezone,
  onClose,
  onSelect,
}: EventTimezonePickerModalProps) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => buildTimezoneOptions(), []);
  const filteredOptions = useMemo(() => searchTimezoneOptions(options, query), [options, query]);

  const handleSelect = (option: TimezoneOption) => {
    onSelect(option.value);
    setQuery("");
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons color={theme.colors.textPrimary} name="close" size={24} />
          </Pressable>
          <AppText variant="sectionTitle">Etkinlik Saat Dilimi</AppText>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            onChangeText={setQuery}
            placeholder="Şehir veya IANA adı ara"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item.value === selectedTimezone;
            return (
              <Pressable onPress={() => handleSelect(item)} style={[styles.option, active && styles.optionActive]}>
                <AppText style={[styles.optionLabel, active && styles.optionLabelActive]} variant="body">
                  {item.value}
                </AppText>
                <AppText style={styles.optionHint} variant="caption">
                  {formatTimezoneOptionLabel(item.value).includes("·")
                    ? formatTimezoneOptionLabel(item.value).split("·")[1]?.trim()
                    : item.label !== item.value
                      ? item.label
                      : " "}
                </AppText>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  closeButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  searchWrap: {
    padding: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  option: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  optionActive: {
    backgroundColor: "#F5F3FF",
  },
  optionLabel: {
    color: theme.colors.textPrimary,
  },
  optionLabelActive: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  optionHint: {
    color: theme.colors.textSecondary,
  },
});
