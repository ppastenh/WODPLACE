import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetTrainingSettings } from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { BarLoadDiagram } from '@/components/rm/BarLoadDiagram';
import { PlatePalette } from '@/components/rm/PlatePalette';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import {
  addPlate,
  computeBarLoad,
  removePlate,
  type BarLoadResult,
  type LoadedPlate,
  type PlateSpec,
} from '@/lib/rm/barLoad';
import { fromKg, toKg, trimNum, type Unit } from '@/lib/rm/units';

export default function BarLoaderScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { prefillKg } = useLocalSearchParams<{ prefillKg?: string }>();

  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });

  const [unit, setUnit] = React.useState<Unit>('kg');
  const [barKg, setBarKg] = React.useState(20);
  const [countBar, setCountBar] = React.useState(true);
  const [target, setTarget] = React.useState('');
  const [mode, setMode] = React.useState<'auto' | 'manual'>('manual');
  const [perSide, setPerSide] = React.useState<LoadedPlate[]>([]);
  const seeded = React.useRef(false);

  const plates: PlateSpec[] = (settings.data?.plates ?? []) as PlateSpec[];

  React.useEffect(() => {
    if (!settings.data || seeded.current) return;
    seeded.current = true;
    const u = (settings.data.preferredUnit ?? 'kg') as Unit;
    setUnit(u);
    setBarKg(toKg(settings.data.barWeight, settings.data.barUnit as Unit));
    if (prefillKg) {
      setTarget(trimNum(fromKg(Number(prefillKg), u), 1));
      setMode('auto');
    }
  }, [settings.data, prefillKg]);

  // What "Peso total" means depends on the countBar switch:
  //   ON  -> the number includes the bar   (perSideTarget = (n - bar) / 2)
  //   OFF -> the number is plates only      (perSideTarget = n / 2)
  // computeBarLoad takes the full bar+plates target and subtracts the bar
  // itself, so for OFF we hand it n + bar.
  const compute = (n: number): BarLoadResult =>
    computeBarLoad(
      countBar ? toKg(n, unit) : toKg(n, unit) + barKg,
      'kg',
      barKg,
      'kg',
      plates,
    );

  React.useEffect(() => {
    if (mode !== 'auto') return;
    const n = Number(target.replace(',', '.'));
    setPerSide(!Number.isFinite(n) || n <= 0 ? [] : compute(n).perSide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, target, unit, barKg, countBar, settings.data]);

  // If the bar is emptied plate-by-plate in manual mode, drop the stale
  // "Peso total" the user had typed.
  React.useEffect(() => {
    if (mode === 'manual' && perSide.length === 0 && target) setTarget('');
  }, [mode, perSide.length, target]);

  const targetNum = Number(target.replace(',', '.'));
  const autoResult =
    mode === 'auto' && targetNum > 0 ? compute(targetNum) : null;

  const sideKg = perSide.reduce((acc, p) => acc + p.kg, 0);
  const discsKg = 2 * sideKg;
  const totalKg = (countBar ? barKg : 0) + discsKg;
  const fmtUnit = (kg: number) =>
    unit === 'lb' ? `${trimNum(fromKg(kg, 'lb'), 1)} lb` : `${trimNum(kg, 2)} kg`;
  const totalPrimary =
    unit === 'lb'
      ? `${trimNum(fromKg(totalKg, 'lb'), 1)} lb`
      : `${trimNum(totalKg, 2)} kg`;
  const totalSecondary =
    unit === 'lb'
      ? `${trimNum(totalKg, 2)} kg`
      : `${trimNum(fromKg(totalKg, 'lb'), 1)} lb`;

  const onType = (t: string) => {
    setMode('auto');
    setTarget(t);
  };
  const onAdd = (u: Unit, w: number) => {
    setMode('manual');
    setPerSide((cur) => addPlate(cur, u, w));
  };
  const onRemove = (u: Unit, w: number) => {
    setMode('manual');
    setPerSide((cur) => removePlate(cur, u, w));
  };
  const clearBar = () => {
    setMode('manual');
    setPerSide([]);
    setTarget('');
  };

  if (settings.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RmHeader title="Carga de barra" onBack={() => router.replace('/home')} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader
        title="Carga de barra"
        onBack={() => router.replace('/home')}
        right={
          <Pressable onPress={() => router.push('/rm/estimated-max' as never)} hitSlop={10}>
            <Feather name="trending-up" size={20} color={colors.primary} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Barra */}
        <View style={styles.inline}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Barra</Text>
          <View style={styles.pillRow}>
            {[20, 15].map((kg) => {
              const on = Math.abs(barKg - kg) < 0.1;
              return (
                <Pressable
                  key={kg}
                  onPress={() => setBarKg(kg)}
                  style={[
                    styles.pill,
                    { backgroundColor: on ? colors.primary : colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.pillText, { color: on ? colors.primaryForeground : colors.foreground }]}>
                    {kg} kg
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Peso total */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Peso total</Text>
        <View style={styles.targetRow}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            value={target}
            onChangeText={onType}
            keyboardType="decimal-pad"
            placeholder="Ej: 100"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={[styles.toggle, { borderColor: colors.border }]}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  setMode('auto');
                  setUnit(u);
                }}
                style={[styles.toggleBtn, { backgroundColor: unit === u ? colors.primary : 'transparent' }]}
              >
                <Text style={[styles.toggleText, { color: unit === u ? colors.primaryForeground : colors.mutedForeground }]}>
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Barra visual */}
        <View style={[styles.barCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Tu carga actual</Text>
          <BarLoadDiagram
            perSide={perSide}
            barLabel={`${trimNum(barKg, 2)} kg`}
            onRemove={onRemove}
          />

          {/* total */}
          <View style={styles.totalBlock}>
            <Text style={[styles.total, { color: colors.foreground }]}>{totalPrimary}</Text>
            <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>{totalSecondary}</Text>
          </View>

          {/* status */}
          {autoResult?.error ? (
            <Text style={[styles.status, { color: colors.destructive }]}>{autoResult.error}</Text>
          ) : autoResult ? (
            <Text
              style={[
                styles.status,
                { color: autoResult.exact ? colors.primary : colors.mutedForeground },
              ]}
            >
              {autoResult.exact
                ? 'Exacto para el peso pedido'
                : autoResult.remainderKg > 0
                  ? `Lo más cercano: faltan ${trimNum(autoResult.remainderKg, 2)} kg`
                  : `Lo más cercano: te pasás ${trimNum(-autoResult.remainderKg, 2)} kg`}
            </Text>
          ) : perSide.length === 0 ? (
            <View style={[styles.emptyBadge, { backgroundColor: colors.secondary }]}>
              <View style={[styles.emptyDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.emptyBadgeText, { color: colors.mutedForeground }]}>Barra vacía</Text>
            </View>
          ) : (
            <Text style={[styles.status, { color: colors.mutedForeground }]}>Armada a mano</Text>
          )}

          {/* breakdown */}
          <View style={styles.breakdown}>
            {[
              { k: 'Cada lado', v: fmtUnit(sideKg) },
              { k: 'Discos', v: fmtUnit(discsKg) },
              { k: 'Barra', v: countBar ? `${trimNum(barKg, 2)} kg` : 'no cuenta' },
            ].map((b) => (
              <View key={b.k} style={[styles.bBox, { borderColor: colors.border }]}>
                <Text style={[styles.bLabel, { color: colors.mutedForeground }]}>{b.k}</Text>
                <Text style={[styles.bValue, { color: colors.foreground }]}>{b.v}</Text>
              </View>
            ))}
          </View>

          {/* count-the-bar toggle */}
          <Pressable
            onPress={() => setCountBar((v) => !v)}
            style={styles.switchRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: countBar }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                Contar la barra en el total
              </Text>
              <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>
                {countBar
                  ? 'El peso que escribís incluye la barra'
                  : 'El peso que escribís son solo los discos'}
              </Text>
            </View>
            <View
              style={[
                styles.track,
                { backgroundColor: countBar ? colors.primary : colors.border },
              ]}
            >
              <View
                style={[
                  styles.thumb,
                  {
                    backgroundColor: countBar ? colors.primaryForeground : colors.mutedForeground,
                    alignSelf: countBar ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </View>
          </Pressable>

          {perSide.length > 0 ? (
            <Pressable onPress={clearBar} style={styles.clearBtn} hitSlop={6}>
              <Feather name="rotate-ccw" size={13} color={colors.mutedForeground} />
              <Text style={[styles.clear, { color: colors.mutedForeground }]}>Vaciar barra</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Paleta manual */}
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 8 }]}>
          Agregar discos a mano
        </Text>
        <PlatePalette plates={plates} perSide={perSide} onAdd={onAdd} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 10, paddingBottom: 44 },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  barCard: { borderRadius: 16, padding: 12, marginTop: 6, gap: 7 },
  cardLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalBlock: { alignItems: 'center' },
  total: { fontSize: 28, fontFamily: 'Anton_400Regular' },
  totalSub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: -2 },
  status: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  emptyDot: { width: 6, height: 6, borderRadius: 3 },
  emptyBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  breakdown: { flexDirection: 'row', gap: 6 },
  bBox: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 1,
  },
  bLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.3 },
  bValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  switchSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: { width: 20, height: 20, borderRadius: 10 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  clear: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
