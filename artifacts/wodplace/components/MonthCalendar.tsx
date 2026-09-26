import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { WEEK_HEADER_DAYS, getMonthMatrix, isAfterDay, isBeforeDay, isSameDay, toDateKey } from '@/lib/dateUtils';

interface MonthCalendarProps {
  monthDate: Date;
  selectedDate: Date;
  today: Date;
  /** Last day that can still be selected — booking is limited to a 7-day
   *  window (today included), so anything after this is disabled the same
   *  way past days already are. */
  maxDate: Date;
  /** dateKeys ("YYYY-MM-DD") that have a confirmed or waitlisted booking —
   *  shown as a small dot under the day number. */
  bookedDates: Set<string>;
  onSelect: (date: Date) => void;
}

export function MonthCalendar({ monthDate, selectedDate, today, maxDate, bookedDates, onSelect }: MonthCalendarProps) {
  const colors = useColors();
  const weeks = getMonthMatrix(monthDate.getFullYear(), monthDate.getMonth());

  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEK_HEADER_DAYS.map((day) => (
          <Text key={day} style={[styles.weekHeaderText, { color: colors.mutedForeground }]}>
            {day}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day) => {
            const inMonth = day.getMonth() === monthDate.getMonth();
            const isPast = isBeforeDay(day, today);
            const isTooFar = isAfterDay(day, maxDate);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const isBookedDay = bookedDates.has(toDateKey(day));
            const disabled = isPast || isTooFar;

            return (
              <Pressable
                key={day.toISOString()}
                disabled={disabled}
                onPress={() => onSelect(day)}
                style={styles.dayCell}
              >
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
                            : inMonth
                              ? colors.foreground
                              : colors.mutedForeground,
                        opacity: disabled || !inMonth ? 0.4 : 1,
                        fontFamily: isToday || isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
