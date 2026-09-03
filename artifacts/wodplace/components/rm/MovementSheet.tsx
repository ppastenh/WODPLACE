import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useListMovements,
  useListPrs,
  type Movement,
} from '@workspace/api-client-react';
import { useDarkColors } from '@/hooks/useDarkColors';

type Props = {
  visible: boolean;
  userId: string;
  selectedId: string | null;
  onSelect: (movement: Movement) => void;
  onClose: () => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  squat_dl: 'Sentadillas / Peso muerto',
  press: 'Presses',
  olympic: 'Olímpicos',
  other: 'Otros',
  custom: 'Míos',
};
const CATEGORY_ORDER = ['squat_dl', 'press', 'olympic', 'other', 'custom'];

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function MovementSheet({ visible, userId, selectedId, onSelect, onClose }: Props) {
  const colors = useDarkColors();
  const insets = useSafeAreaInsets();

  const list = useListMovements({ userId }, { query: { enabled: !!userId && visible } as never });
  const prs = useListPrs({ userId }, { query: { enabled: !!userId && visible } as never });

  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const movements = list.data ?? [];
  const q = norm(query);
  const filtered = q ? movements.filter((m) => norm(m.name).includes(q)) : movements;

  const recents = React.useMemo(() => {
    if (q || !prs.data?.length) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const p of prs.data) {
      if (!seen.has(p.movementId)) {
        seen.add(p.movementId);
        ids.push(p.movementId);
      }
    }
    return ids
      .slice(0, 6)
      .map((id) => movements.find((m) => m.id === id))
      .filter((m): m is Movement => !!m);
  }, [q, prs.data, movements]);

  const groups = React.useMemo(() => {
    const byCat = new Map<string, Movement[]>();
    for (const m of filtered) {
      const key = m.isDefault ? m.category ?? 'other' : 'custom';
      const arr = byCat.get(key) ?? [];
      arr.push(m);
      byCat.set(key, arr);
    }
    return CATEGORY_ORDER.filter((k) => byCat.has(k)).map((k) => ({
      key: k,
      label: CATEGORY_LABEL[k] ?? 'Otros',
      items: byCat.get(k)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filtered]);

  const pick = (m: Movement) => {
    onSelect(m);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.secondary, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Elegí el movimiento</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar movimiento"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {list.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : (
          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {recents.length ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recientes</Text>
                <View style={styles.chips}>
                  {recents.map((m) => {
                    const active = m.id === selectedId;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => pick(m)}
                        style={({ pressed }) => [
                          styles.chip,
                          {
                            backgroundColor: active ? colors.primary : colors.card,
                            borderColor: active ? colors.primary : colors.border,
                          },
                          pressed && { opacity: 0.75 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: active ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {groups.map((g) => (
              <View key={g.key} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{g.label}</Text>
                {g.items.map((m) => {
                  const active = m.id === selectedId;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => pick(m)}
                      style={({ pressed }) => [
                        styles.row,
                        { borderColor: colors.border },
                        active && { backgroundColor: colors.card },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.rowText, { color: colors.foreground }]}>{m.name}</Text>
                      {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {q && !groups.length ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                Sin resultados para “{query}”.
              </Text>
            ) : null}

            <View style={{ height: 12 }} />
          </ScrollView>
        )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,9,11,0.6)' },
  kav: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 0 },
  body: { marginTop: 12 },
  section: { marginBottom: 18, gap: 6 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  rowText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  empty: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 20 },
});
