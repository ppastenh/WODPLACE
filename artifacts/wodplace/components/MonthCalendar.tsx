import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DAY_NAMES_SHORT, getMonthMatrix, isBeforeDay, isSameDay } from '@/lib/dateUtils';

interface MonthCalendarProps {
  monthDate: Date;
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

export function MonthCalendar({ monthDate, selectedDate, today, onSelect }: MonthCalendarProps) {
  const colors = useColors();
  const weeks = getMonthMatrix(monthDate.getFullYear(), monthDate.getMonth());

  return (
    <View>
      <View style={styles.weekHeader}>
        {DAY_NAMES_SHORT.map((day) => (
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
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const disabled = isPast;

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
});
