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
import { Feather } from '@expo/vector-icons';
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

  // Tapping a row selects it directly and snaps it to the center — this gives a
  // precise, drag-independent way to land on a specific value (e.g. day 12),
  // instead of relying purely on scroll-snap accuracy which can be imprecise
  // on web/trackpad input.
  const selectIndex = (index: number) => {
    lastCommittedRef.current = index;
    setPendingIndex(index);
    onChangeIndex(index);
    listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: true });
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
            <Pressable onPress={() => selectIndex(index)} style={styles.wheelItem}>
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
            </Pressable>
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
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Reset the confirm step each time the sheet is (re)opened.
  const prevVisibleRef = useRef(visible);
  if (visible && !prevVisibleRef.current && confirmVisible) {
    setConfirmVisible(false);
  }
  prevVisibleRef.current = visible;

  const selectedYear = years[yearIndex] ?? years[years.length - 1];
  const dayCount = daysInMonth(selectedYear, monthIndex);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const clampedDayIndex = Math.min(dayIndex, days.length - 1);

  const commitSave = () => {
    const day = days[clampedDayIndex] ?? 1;
    const month = monthIndex + 1;
    const year = selectedYear;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSave(iso);
    onClose();
  };

  const handleSave = () => {
    // Every save (first time or a later change) requires an explicit
    // confirmation, since the birthdate is treated as locked/confirmed data
    // once saved. React Native Web's Alert.alert is a no-op, so this
    // confirmation is rendered in-sheet instead of using Alert.
    setConfirmVisible(true);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={confirmVisible ? undefined : onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        {confirmVisible ? (
          <View style={styles.confirmWrap}>
            <View style={[styles.confirmIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="lock" size={20} color={colors.foreground} />
            </View>
            <Text
              style={[styles.title, { color: colors.foreground, marginBottom: 0, textAlign: 'center' }]}
            >
              Confirmar fecha de nacimiento
            </Text>
            <Text
              style={[
                styles.warningText,
                { color: colors.mutedForeground, marginTop: 8, textAlign: 'center' },
              ]}
            >
              Tu fecha de nacimiento quedará registrada y bloqueada. ¿Deseas guardar este cambio?
            </Text>
            <View style={styles.confirmActions}>
              <AppButton
                label="Confirmar"
                variant="primary"
                fullWidth
                onPress={commitSave}
                testID="birthdate-confirm"
              />
              <AppButton
                label="Revisar de nuevo"
                variant="outlineDark"
                fullWidth
                onPress={() => setConfirmVisible(false)}
                testID="birthdate-confirm-cancel"
              />
            </View>
          </View>
        ) : (
          <>
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

            <View style={[styles.warningBox, { backgroundColor: colors.secondary }]}>
              <Feather name="lock" size={14} color={colors.mutedForeground} />
              <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                Al guardar, esta fecha quedará registrada y se bloqueará nuevamente.
              </Text>
            </View>

            <AppButton
              label="Guardar"
              variant="primary"
              fullWidth
              onPress={handleSave}
              style={styles.saveButton}
              testID="birthdate-save"
            />
          </>
        )}
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
    ...StyleSheet.absoluteFill,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  confirmWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 4,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmActions: {
    width: '100%',
    gap: 10,
    marginTop: 22,
  },
});
