import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { DAY_NAMES_SHORT, getWeekDays, isBeforeDay, isSameDay } from '@/lib/dateUtils';

interface WeekCalendarProps {
  anchorDate: Date;
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
}

export function WeekCalendar({ anchorDate, selectedDate, today, onSelect }: WeekCalendarProps) {
  const colors = useColors();
  const days = getWeekDays(anchorDate);

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const isPast = isBeforeDay(day, today);
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);

        return (
          <Pressable
            key={day.toISOString()}
            disabled={isPast}
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
                      : isPast
                        ? colors.mutedForeground
                        : colors.foreground,
                    opacity: isPast ? 0.4 : 1,
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
