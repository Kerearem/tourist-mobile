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

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function WheelColumn({ items, selectedIndex, onSelect }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isFirstLayout = useRef(true);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTo({
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const clampDateParts = (
  year: number,
  month: number,
  day: number,
  minimumDate: Date,
  maximumDate: Date,
) => {
  const minYear = minimumDate.getFullYear();
  const maxYear = maximumDate.getFullYear();
  let nextYear = Math.min(maxYear, Math.max(minYear, year));
  let minMonth = 1;
  let maxMonth = 12;

  if (nextYear === minYear) {
    minMonth = minimumDate.getMonth() + 1;
  }
  if (nextYear === maxYear) {
    maxMonth = maximumDate.getMonth() + 1;
  }

  let nextMonth = Math.min(maxMonth, Math.max(minMonth, month));

  let minDay = 1;
  let maxDay = daysInMonth(nextYear, nextMonth);

  if (nextYear === minYear && nextMonth === minimumDate.getMonth() + 1) {
    minDay = minimumDate.getDate();
  }
  if (nextYear === maxYear && nextMonth === maximumDate.getMonth() + 1) {
    maxDay = Math.min(maxDay, maximumDate.getDate());
  }

  const nextDay = Math.min(maxDay, Math.max(minDay, day));

  return { year: nextYear, month: nextMonth, day: nextDay };
};

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function BirthDatePicker({ value, onChange, minimumDate, maximumDate }: Props) {
  const minDate = minimumDate ?? new Date(new Date().getFullYear() - 100, 0, 1);
  const maxDate = maximumDate ?? new Date();

  const parts = useMemo(
    () =>
      clampDateParts(
        value.getFullYear(),
        value.getMonth() + 1,
        value.getDate(),
        minDate,
        maxDate,
      ),
    [value, minDate, maxDate],
  );

  const years = useMemo(() => {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(minYear + index));
  }, [minDate, maxDate]);

  const months = useMemo(() => {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    let start = 1;
    let end = 12;

    if (parts.year === minYear) {
      start = minDate.getMonth() + 1;
    }
    if (parts.year === maxYear) {
      end = maxDate.getMonth() + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, index) => {
      const month = start + index;
      return MONTH_LABELS[month - 1];
    });
  }, [parts.year, minDate, maxDate]);

  const monthValues = useMemo(() => {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    let start = 1;
    let end = 12;

    if (parts.year === minYear) {
      start = minDate.getMonth() + 1;
    }
    if (parts.year === maxYear) {
      end = maxDate.getMonth() + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [parts.year, minDate, maxDate]);

  const days = useMemo(() => {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    let start = 1;
    let end = daysInMonth(parts.year, parts.month);

    if (parts.year === minYear && parts.month === minDate.getMonth() + 1) {
      start = minDate.getDate();
    }
    if (parts.year === maxYear && parts.month === maxDate.getMonth() + 1) {
      end = Math.min(end, maxDate.getDate());
    }

    return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
  }, [parts.year, parts.month, minDate, maxDate]);

  const dayValues = useMemo(() => days.map((day) => Number(day)), [days]);

  const yearIndex = Math.max(0, years.indexOf(String(parts.year)));
  const monthIndex = Math.max(0, monthValues.indexOf(parts.month));
  const dayIndex = Math.max(0, dayValues.indexOf(parts.day));

  const emitChange = (year: number, month: number, day: number) => {
    const clamped = clampDateParts(year, month, day, minDate, maxDate);
    const nextDate = new Date(clamped.year, clamped.month - 1, clamped.day, 12, 0, 0, 0);
    onChange(nextDate);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.selectedHighlight} pointerEvents="none" />

      <View style={styles.columns}>
        <WheelColumn
          items={days}
          onSelect={(index) => emitChange(parts.year, parts.month, dayValues[index] ?? parts.day)}
          selectedIndex={dayIndex}
        />
        <WheelColumn
          items={months}
          onSelect={(index) => emitChange(parts.year, monthValues[index] ?? parts.month, parts.day)}
          selectedIndex={monthIndex}
        />
        <WheelColumn
          items={years}
          onSelect={(index) => emitChange(Number(years[index]), parts.month, parts.day)}
          selectedIndex={yearIndex}
        />
      </View>

      <View pointerEvents="none" style={styles.columnLabels}>
        <AppText muted style={styles.columnLabel} variant="caption">
          Day
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Month
        </AppText>
        <AppText muted style={styles.columnLabel} variant="caption">
          Year
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
    fontSize: 18,
  },
  itemTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  selectedHighlight: {
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.sm,
    height: ITEM_HEIGHT,
    left: theme.spacing.sm,
    position: "absolute",
    right: theme.spacing.sm,
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
    textAlign: "center",
  },
});
