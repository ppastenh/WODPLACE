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
import { plateKey, type PlateSpec } from '@/lib/rm/barLoad';
import { plateFill, plateStroke } from '@/lib/rm/plateColors';
import { trimNum } from '@/lib/rm/units';

/** Set that's enabled by default (kg only, typical box). */
export const DEFAULT_PLATES: PlateSpec[] = [
  { unit: 'kg', weight: 25, pairs: 4 },
  { unit: 'kg', weight: 20, pairs: 4 },
  { unit: 'kg', weight: 15, pairs: 2 },
  { unit: 'kg', weight: 10, pairs: 2 },
  { unit: 'kg', weight: 5, pairs: 2 },
  { unit: 'kg', weight: 2.5, pairs: 2 },
  { unit: 'kg', weight: 1.25, pairs: 2 },
  { unit: 'kg', weight: 1, pairs: 2 },
  { unit: 'kg', weight: 0.5, pairs: 2 },
];

const GROUPS: Array<{ label: string; items: Array<Omit<PlateSpec, 'pairs'>> }> = [
  {
    label: 'Discos en libras',
    items: [55, 45, 35, 25, 15, 10].map((weight) => ({ unit: 'lb', weight })),
  },
  {
    label: 'Discos en kilos (estándar)',
    items: [25, 20, 15, 10, 5].map((weight) => ({ unit: 'kg', weight })),
  },
  {
    label: 'Fraccionados / técnicos (kg)',
    items: [2.5, 2, 1.5, 1.25, 1, 0.5].map((weight) => ({ unit: 'kg', weight })),
  },
];

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

  const byKey = new Map(draft.map((p) => [plateKey(p.unit, p.weight), p]));

  const setPairs = (item: Omit<PlateSpec, 'pairs'>, pairs: number) => {
    const rest = draft.filter((p) => plateKey(p.unit, p.weight) !== plateKey(item.unit, item.weight));
    persist(pairs <= 0 ? rest : [...rest, { ...item, pairs }]);
  };
  const toggle = (item: Omit<PlateSpec, 'pairs'>, on: boolean) =>
    setPairs(item, on ? byKey.get(plateKey(item.unit, item.weight))?.pairs || 2 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Discos disponibles" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Marcá los discos que tiene tu box y cuántos pares hay de cada uno. La
          calculadora de barra usa esto.
        </Text>

        {GROUPS.map((g) => (
          <View key={g.label} style={{ gap: 8 }}>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{g.label}</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {g.items.map((item, i) => {
                const cur = byKey.get(plateKey(item.unit, item.weight));
                const pairs = cur?.pairs ?? 0;
                const on = pairs > 0;
                return (
                  <View
                    key={plateKey(item.unit, item.weight)}
                    style={[
                      styles.row,
                      i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <Pressable
                      onPress={() => toggle(item, !on)}
                      style={[
                        styles.check,
                        {
                          borderColor: on ? colors.primary : colors.border,
                          backgroundColor: on ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {on ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                    </Pressable>
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: plateFill(item.unit, item.weight),
                          borderColor: plateStroke(item.unit, item.weight),
                          opacity: on ? 1 : 0.35,
                        },
                      ]}
                    />
                    <Text style={[styles.plateLabel, { color: on ? colors.foreground : colors.mutedForeground }]}>
                      {trimNum(item.weight, 2)} {item.unit}
                    </Text>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => setPairs(item, pairs - 1)}
                        disabled={!on}
                        style={[styles.stepBtn, { borderColor: colors.border, opacity: on ? 1 : 0.3 }]}
                      >
                        <Feather name="minus" size={14} color={colors.foreground} />
                      </Pressable>
                      <Text style={[styles.pairs, { color: colors.foreground }]}>{pairs}</Text>
                      <Pressable
                        onPress={() => setPairs(item, pairs + 1)}
                        style={[styles.stepBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="plus" size={14} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => persist(DEFAULT_PLATES)}
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
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  swatch: { width: 16, height: 24, borderRadius: 3, borderWidth: 1 },
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
