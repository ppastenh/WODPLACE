import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useGetTrainingSettings,
  useUpsertTrainingSettings,
} from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { PlateSpec } from '@/lib/rm/barLoad';
import { trimNum } from '@/lib/rm/units';

const DEFAULT_KG: PlateSpec[] = [
  { unit: 'kg', weight: 25, pairs: 4 },
  { unit: 'kg', weight: 20, pairs: 4 },
  { unit: 'kg', weight: 15, pairs: 2 },
  { unit: 'kg', weight: 10, pairs: 2 },
  { unit: 'kg', weight: 5, pairs: 2 },
  { unit: 'kg', weight: 2.5, pairs: 2 },
  { unit: 'kg', weight: 1.25, pairs: 2 },
  { unit: 'kg', weight: 0.5, pairs: 2 },
];
// Extra sizes the user can enable (kg technical + a few lb plates).
const CATALOG: PlateSpec[] = [
  ...DEFAULT_KG,
  { unit: 'kg', weight: 0.25, pairs: 2 },
  { unit: 'lb', weight: 45, pairs: 2 },
  { unit: 'lb', weight: 25, pairs: 2 },
  { unit: 'lb', weight: 10, pairs: 2 },
  { unit: 'lb', weight: 5, pairs: 2 },
  { unit: 'lb', weight: 2.5, pairs: 2 },
];

const keyOf = (p: Pick<PlateSpec, 'unit' | 'weight'>) => `${p.unit}:${p.weight}`;

export default function PlatesScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });
  const upsert = useUpsertTrainingSettings();

  const [draft, setDraft] = React.useState<PlateSpec[] | null>(null);

  React.useEffect(() => {
    if (settings.data && draft === null) setDraft(settings.data.plates);
  }, [settings.data, draft]);

  const persist = (next: PlateSpec[]) => {
    setDraft(next);
    const s = settings.data;
    if (!s) return;
    upsert.mutate(
      {
        data: {
          userId,
          preferredUnit: s.preferredUnit,
          sex: s.sex ?? null,
          barWeight: s.barWeight,
          barUnit: s.barUnit,
          plates: next,
        },
      },
      { onSuccess: () => settings.refetch() },
    );
  };

  if (settings.isLoading || draft === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RmHeader title="Discos disponibles" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const enabled = new Map(draft.map((p) => [keyOf(p), p]));
  const rows = CATALOG.map((c) => enabled.get(keyOf(c)) ?? { ...c, pairs: 0 }).sort((a, b) => {
    if (a.unit !== b.unit) return a.unit === 'kg' ? -1 : 1;
    return b.weight - a.weight;
  });

  const toggle = (row: PlateSpec, on: boolean) => {
    const rest = draft.filter((p) => keyOf(p) !== keyOf(row));
    persist(on ? [...rest, { ...row, pairs: row.pairs || 2 }] : rest);
  };
  const setPairs = (row: PlateSpec, pairs: number) => {
    if (pairs <= 0) return toggle(row, false);
    persist([...draft.filter((p) => keyOf(p) !== keyOf(row)), { ...row, pairs }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Discos disponibles" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Marcá los discos que tiene tu box y cuántos pares hay de cada uno. La
          calculadora de barra usa esto.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {rows.map((row, i) => {
            const on = enabled.has(keyOf(row)) && (enabled.get(keyOf(row))?.pairs ?? 0) > 0;
            return (
              <View
                key={keyOf(row)}
                style={[
                  styles.row,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <Pressable
                  onPress={() => toggle(row, !on)}
                  style={[
                    styles.check,
                    { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : 'transparent' },
                  ]}
                >
                  {on ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                </Pressable>
                <Text style={[styles.plateLabel, { color: on ? colors.foreground : colors.mutedForeground }]}>
                  {trimNum(row.weight, 2)} {row.unit}
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => setPairs(row, (enabled.get(keyOf(row))?.pairs ?? 0) - 1)}
                    disabled={!on}
                    style={[styles.stepBtn, { borderColor: colors.border, opacity: on ? 1 : 0.3 }]}
                  >
                    <Feather name="minus" size={14} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.pairs, { color: colors.foreground }]}>
                    {on ? enabled.get(keyOf(row))?.pairs ?? 0 : 0}
                  </Text>
                  <Pressable
                    onPress={() => setPairs(row, (enabled.get(keyOf(row))?.pairs ?? 0) + 1)}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                  >
                    <Feather name="plus" size={14} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => persist(DEFAULT_KG)}
          style={[styles.resetBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>Volver al set por defecto</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  intro: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairs: { fontSize: 14, fontFamily: 'Inter_700Bold', width: 20, textAlign: 'center' },
  resetBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
