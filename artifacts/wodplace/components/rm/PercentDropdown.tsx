import React from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDarkColors } from '@/hooks/useDarkColors';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

/** Compact percentage picker (30–110, step 5) shown as a chip that opens a
 *  drop-down list anchored under itself. Copper while not 100%. */
export function PercentDropdown({
  value,
  onChange,
  min = 30,
  max = 110,
  step = 5,
}: Props) {
  const colors = useDarkColors();
  const insets = useSafeAreaInsets();
  const chipRef = React.useRef<View>(null);
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<{ top: number; right: number }>({
    top: insets.top + 120,
    right: 16,
  });

  const options = React.useMemo(() => {
    const out: number[] = [];
    for (let v = min; v <= max; v += step) out.push(v);
    return out;
  }, [min, max, step]);

  const active = value !== 100;

  const openMenu = () => {
    const node = chipRef.current;
    if (node) {
      node.measureInWindow((x, y, w, h) => {
        const screenW = Dimensions.get('window').width;
        setAnchor({ top: y + h + 6, right: Math.max(12, screenW - (x + w)) });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <View ref={chipRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          hitSlop={6}
          style={({ pressed }) => [
            styles.chip,
            {
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: colors.secondary,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.chipText, { color: active ? colors.primary : colors.foreground }]}>
            {value}%
          </Text>
          <Feather
            name="chevron-down"
            size={14}
            color={active ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.menu,
            { top: anchor.top, right: anchor.right, backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.menuLabel, { color: colors.mutedForeground }]}>% del objetivo</Text>
          <ScrollView style={{ maxHeight: 258 }} showsVerticalScrollIndicator={false}>
            {options.map((v) => {
              const on = v === value;
              return (
                <Pressable
                  key={v}
                  onPress={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    on && { backgroundColor: colors.secondary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.rowText, { color: on ? colors.primary : colors.foreground }]}>
                    {v}%
                  </Text>
                  {on ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,9,11,0.35)' },
  menu: {
    position: 'absolute',
    minWidth: 128,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  menuLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
