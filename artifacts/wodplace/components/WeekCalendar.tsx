import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DAY_NAMES_SHORT, getWeekDays, isAfterDay, isBeforeDay, isSameDay, toDateKey } from '@/lib/dateUtils';

interface WeekCalendarProps {
  anchorDate: Date;
  selectedDate: Date;
  today: Date;
  /** Same 7-day booking window cutoff as MonthCalendar. */
  maxDate: Date;
  /** dateKeys ("YYYY-MM-DD") that have a confirmed or waitlisted booking. */
  bookedDates: Set<string>;
  onSelect: (date: Date) => void;
}

export function WeekCalendar({ anchorDate, selectedDate, today, maxDate, bookedDates, onSelect }: WeekCalendarProps) {
  const colors = useColors();
  const days = getWeekDays(anchorDate);

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const isPast = isBeforeDay(day, today);
        const isTooFar = isAfterDay(day, maxDate);
        const disabled = isPast || isTooFar;
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);
        const isBookedDay = bookedDates.has(toDateKey(day));

        return (
          <Pressable
            key={day.toISOString()}
            disabled={disabled}
            onPress={() => onSelect(day)}
            style={styles.dayCell}
          >
            <Text style={[styles.weekday, { color: colors.mutedForeground }]}>
              {DAY_NAMES_SHORT[day.getDay()]}
            </Text>
            <View
              style={[
                styles.dayCircle,
                isSelected && { backgroundColor: colors.primary },
                isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isSelected
                      ? colors.primaryForeground
                      : disabled
                        ? colors.mutedForeground
                        : colors.foreground,
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
              >
                {day.getDate()}
              </Text>
            </View>
            <View style={[styles.dayDot, { backgroundColor: isBookedDay ? colors.success : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'center',
    gap: 8,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: -2,
  },
  weekday: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
