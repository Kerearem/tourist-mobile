import React, { useEffect, useMemo, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function WheelColumn({ items, selectedIndex, onSelect }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isFirstLayout = useRef(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: !isFirstLayout.current,
    });
    isFirstLayout.current = false;
  }, [selectedIndex]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.min(items.length - 1, Math.max(0, Math.round(offsetY / ITEM_HEIGHT)));
    onSelect(index);
  };

  return (
    <View style={styles.column}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.columnContent}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={ITEM_HEIGHT}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={`${item}-${index}`} style={styles.item}>
              <AppText style={[styles.itemText, isSelected && styles.itemTextSelected]}>{item}</AppText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

import { buildHourValues, buildMinuteValues } from "../utils/eventDateTimePickerConstraints";

const clampParts = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  minimumDate: Date,
) => {
  const minYear = minimumDate.getFullYear();
  const maxYear = minYear + 5;
  let nextYear = Math.min(maxYear, Math.max(minYear, year));

  let minMonth = nextYear === minYear ? minimumDate.getMonth() + 1 : 1;
  let maxMonth = 12;
  let nextMonth = Math.min(maxMonth, Math.max(minMonth, month));

  let minDay = 1;
  let maxDay = daysInMonth(nextYear, nextMonth);
  if (nextYear === minYear && nextMonth === minimumDate.getMonth() + 1) {
    minDay = minimumDate.getDate();
  }
  let nextDay = Math.min(maxDay, Math.max(minDay, day));

  let nextHour = Math.min(23, Math.max(0, hour));
  let nextMinute = Math.min(59, Math.max(0, minute));

  const candidate = new Date(nextYear, nextMonth - 1, nextDay, nextHour, nextMinute, 0, 0);
  if (candidate < minimumDate) {
    nextYear = minimumDate.getFullYear();
    nextMonth = minimumDate.getMonth() + 1;
    nextDay = minimumDate.getDate();
    nextHour = minimumDate.getHours();
    nextMinute = minimumDate.getMinutes();
  }

  return { year: nextYear, month: nextMonth, day: nextDay, hour: nextHour, minute: nextMinute };
};

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

export function EventDateTimePicker({ value, onChange, minimumDate }: Props) {
  const minDate = minimumDate ?? new Date();

  const parts = useMemo(
    () =>
      clampParts(
        value.getFullYear(),
        value.getMonth() + 1,
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        minDate,
      ),
    [value, minDate],
  );

  const years = useMemo(() => {
    const minYear = minDate.getFullYear();
    return Array.from({ length: 6 }, (_, index) => String(minYear + index));
  }, [minDate]);

  const monthValues = useMemo(() => {
    let start = 1;
    let end = 12;
    if (parts.year === minDate.getFullYear()) {
      start = minDate.getMonth() + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [parts.year, minDate]);

  const months = useMemo(() => monthValues.map((month) => MONTH_LABELS[month - 1]), [monthValues]);

  const dayValues = useMemo(() => {
    let start = 1;
    let end = daysInMonth(parts.year, parts.month);
    if (parts.year === minDate.getFullYear() && parts.month === minDate.getMonth() + 1) {
      start = minDate.getDate();
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [parts.year, parts.month, minDate]);

  const days = useMemo(() => dayValues.map(String), [dayValues]);

  const hourValues = useMemo(
    () => buildHourValues(parts.year, parts.month, parts.day, minDate),
    [parts.year, parts.month, parts.day, minDate],
  );

  const hours = useMemo(() => hourValues.map((hour) => String(hour).padStart(2, "0")), [hourValues]);

  const minuteValues = useMemo(
    () => buildMinuteValues(parts.year, parts.month, parts.day, parts.hour, minDate),
    [parts.year, parts.month, parts.day, parts.hour, minDate],
  );

  const minutes = useMemo(
    () => minuteValues.map((minute) => String(minute).padStart(2, "0")),
    [minuteValues],
  );

  const yearIndex = Math.max(0, years.indexOf(String(parts.year)));
  const monthIndex = Math.max(0, monthValues.indexOf(parts.month));
  const dayIndex = Math.max(0, dayValues.indexOf(parts.day));
  const hourIndex = Math.max(0, hourValues.indexOf(parts.hour));
  const minuteIndex = Math.max(0, minuteValues.indexOf(parts.minute));

  const emitChange = (year: number, month: number, day: number, hour: number, minute: number) => {
    const clamped = clampParts(year, month, day, hour, minute, minDate);
    onChange(new Date(clamped.year, clamped.month - 1, clamped.day, clamped.hour, clamped.minute, 0, 0));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.selectedHighlight} pointerEvents="none" />
      <View style={styles.columns}>
        <WheelColumn
          items={days}
          onSelect={(index) => emitChange(parts.year, parts.month, dayValues[index] ?? parts.day, parts.hour, parts.minute)}
          selectedIndex={dayIndex}
        />
        <WheelColumn
          items={months}
          onSelect={(index) => emitChange(parts.year, monthValues[index] ?? parts.month, parts.day, parts.hour, parts.minute)}
          selectedIndex={monthIndex}
        />
        <WheelColumn
          items={years}
          onSelect={(index) => emitChange(Number(years[index]), parts.month, parts.day, parts.hour, parts.minute)}
          selectedIndex={yearIndex}
        />
        <WheelColumn
          items={hours}
          onSelect={(index) =>
            emitChange(parts.year, parts.month, parts.day, hourValues[index] ?? parts.hour, parts.minute)
          }
          selectedIndex={hourIndex}
        />
        <WheelColumn
          items={minutes}
          onSelect={(index) =>
            emitChange(parts.year, parts.month, parts.day, parts.hour, minuteValues[index] ?? parts.minute)
          }
          selectedIndex={minuteIndex}
        />
      </View>
      <View pointerEvents="none" style={styles.columnLabels}>
        <AppText muted style={styles.columnLabel} variant="caption">
          Gün
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Ay
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Yıl
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Saat
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Dk
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  columns: {
    flexDirection: "row",
    height: PICKER_HEIGHT,
  },
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
  },
  columnContent: {
    paddingVertical: WHEEL_PADDING,
  },
  item: {
    alignItems: "center",
    height: ITEM_HEIGHT,
    justifyContent: "center",
  },
  itemText: {
    color: theme.colors.muted,
    fontSize: 16,
  },
  itemTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  selectedHighlight: {
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.sm,
    height: ITEM_HEIGHT,
    left: theme.spacing.xs,
    position: "absolute",
    right: theme.spacing.xs,
    top: WHEEL_PADDING,
    zIndex: -1,
  },
  columnLabels: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  columnLabel: {
    flex: 1,
    fontSize: 11,
    textAlign: "center",
  },
});
