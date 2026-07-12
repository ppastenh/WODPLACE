import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';
import { daysInMonth } from '@/lib/dateUtils';

interface BirthdateModalProps {
  visible: boolean;
  onClose: () => void;
  initialValue: string | null;
  onSave: (value: string) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SIDE_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function currentYear(): number {
  return new Date().getFullYear();
}

function parseInitial(value: string | null): { day: number; month: number; year: number } {
  if (value) {
    const [y, m, d] = value.split('-').map(Number);
    if (y && m && d) return { day: d, month: m - 1, year: y };
  }
  return { day: 1, month: 0, year: currentYear() - 25 };
}

interface WheelColumnProps<T> {
  data: T[];
  selectedIndex: number;
  onChangeIndex: (index: number) => void;
  renderLabel: (item: T) => string;
  width: number;
}

function WheelColumn<T>({ data, selectedIndex, onChangeIndex, renderLabel, width }: WheelColumnProps<T>) {
  const colors = useColors();
  const listRef = useRef<FlatList<T>>(null);
  const [pendingIndex, setPendingIndex] = useState(selectedIndex);
  const lastCommittedRef = useRef(selectedIndex);

  // Commit the nearest index continuously as the list scrolls, rather than only
  // on momentum-end (which is debounced and can arrive after the user already
  // taps "Guardar", leaving the saved value stale).
  const commitFromOffset = (offsetY: number) => {
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, rawIndex));
    if (clamped !== lastCommittedRef.current) {
      lastCommittedRef.current = clamped;
      setPendingIndex(clamped);
      onChangeIndex(clamped);
    }
    return clamped;
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitFromOffset(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const clamped = commitFromOffset(e.nativeEvent.contentOffset.y);
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={{ width, height: WHEEL_HEIGHT }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, index) => String(index)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={selectedIndex}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        contentContainerStyle={{ paddingVertical: SIDE_PADDING }}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        renderItem={({ item, index }) => {
          const isSelected = index === pendingIndex;
          return (
            <View style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  {
                    color: isSelected ? colors.foreground : colors.mutedForeground,
                    opacity: isSelected ? 1 : 0.45,
                    fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                    fontSize: isSelected ? 18 : 15,
                  },
                ]}
              >
                {renderLabel(item)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

export function BirthdateModal({ visible, onClose, initialValue, onSave }: BirthdateModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const initial = useMemo(() => parseInitial(initialValue), [initialValue, visible]);

  const years = useMemo(() => {
    const maxYear = currentYear() - 5;
    const minYear = currentYear() - 100;
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) list.push(y);
    return list;
  }, []);

  const [dayIndex, setDayIndex] = useState(initial.day - 1);
  const [monthIndex, setMonthIndex] = useState(initial.month);
  const [yearIndex, setYearIndex] = useState(
    Math.max(0, years.indexOf(initial.year) === -1 ? years.length - 1 : years.indexOf(initial.year)),
  );

  const selectedYear = years[yearIndex] ?? years[years.length - 1];
  const dayCount = daysInMonth(selectedYear, monthIndex);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const clampedDayIndex = Math.min(dayIndex, days.length - 1);

  const handleSave = () => {
    const day = days[clampedDayIndex] ?? 1;
    const month = monthIndex + 1;
    const year = selectedYear;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSave(iso);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.foreground }]}>Fecha de nacimiento</Text>

        <View style={styles.wheelRow}>
          <View
            style={[
              styles.selectionBand,
              { backgroundColor: colors.secondary, top: SIDE_PADDING },
            ]}
            pointerEvents="none"
          />
          <WheelColumn
            data={days}
            selectedIndex={clampedDayIndex}
            onChangeIndex={setDayIndex}
            renderLabel={(d) => String(d)}
            width={64}
          />
          <WheelColumn
            data={MONTHS_SHORT}
            selectedIndex={monthIndex}
            onChangeIndex={setMonthIndex}
            renderLabel={(m) => m}
            width={90}
          />
          <WheelColumn
            data={years}
            selectedIndex={yearIndex}
            onChangeIndex={setYearIndex}
            renderLabel={(y) => String(y)}
            width={90}
          />
        </View>

        <AppButton label="Guardar" variant="primary" fullWidth onPress={handleSave} style={styles.saveButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 14, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
    marginBottom: 16,
  },
  wheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 12,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 20,
  },
});
