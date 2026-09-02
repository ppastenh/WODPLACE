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
  barTotalKg,
  computeBarLoad,
  removePlate,
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
  const [target, setTarget] = React.useState('');
  const [mode, setMode] = React.useState<'auto' | 'manual'>('manual');
  const [perSide, setPerSide] = React.useState<LoadedPlate[]>([]);
  const seeded = React.useRef(false);

  const plates: PlateSpec[] = (settings.data?.plates ?? []) as PlateSpec[];

  // Seed bar + unit from settings, and a prefilled target, once.
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

  // Auto mode: recompute whenever the inputs change.
  React.useEffect(() => {
    if (mode !== 'auto') return;
    const t = Number(target.replace(',', '.'));
    if (!Number.isFinite(t) || t <= 0) {
      setPerSide([]);
      return;
    }
    setPerSide(computeBarLoad(t, unit, barKg, 'kg', plates).perSide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, target, unit, barKg, settings.data]);

  const autoResult =
    mode === 'auto' && Number(target.replace(',', '.')) > 0
      ? computeBarLoad(Number(target.replace(',', '.')), unit, barKg, 'kg', plates)
      : null;

  const totalKg = barTotalKg(perSide, barKg);

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
        <RmHeader title="Carga de barra" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader
        title="Carga de barra"
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
            {[20, 15].map((kg) => (
              <Pressable
                key={kg}
                onPress={() => setBarKg(kg)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: Math.abs(barKg - kg) < 0.1 ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: Math.abs(barKg - kg) < 0.1 ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {kg} kg
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Peso objetivo (modo automático) */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Peso objetivo</Text>
        <View style={styles.targetRow}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            value={target}
            onChangeText={onType}
            keyboardType="decimal-pad"
            placeholder="Escribí un peso…"
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
                <Text
                  style={[styles.toggleText, { color: unit === u ? colors.primaryForeground : colors.mutedForeground }]}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Barra visual */}
        <View style={[styles.barCard, { backgroundColor: colors.card }]}>
          <BarLoadDiagram perSide={perSide} onRemove={onRemove} />
          <View style={styles.summaryRow}>
            <Text style={[styles.total, { color: colors.foreground }]}>
              {trimNum(totalKg, 2)} kg
              {unit === 'lb' ? `  ·  ${trimNum(fromKg(totalKg, 'lb'), 1)} lb` : ''}
            </Text>
            {perSide.length > 0 ? (
              <Pressable onPress={clearBar} hitSlop={8}>
                <Text style={[styles.clear, { color: colors.mutedForeground }]}>Vaciar</Text>
              </Pressable>
            ) : null}
          </View>
          {autoResult && !autoResult.error ? (
            <Text
              style={[
                styles.autoMsg,
                { color: autoResult.exact ? colors.primary : colors.mutedForeground },
              ]}
            >
              {autoResult.exact
                ? 'Exacto para el objetivo'
                : autoResult.remainderKg > 0
                  ? `Lo más cercano: faltan ${trimNum(autoResult.remainderKg, 2)} kg`
                  : `Lo más cercano: te pasás ${trimNum(-autoResult.remainderKg, 2)} kg`}
            </Text>
          ) : autoResult?.error ? (
            <Text style={[styles.autoMsg, { color: colors.destructive }]}>{autoResult.error}</Text>
          ) : (
            <Text style={[styles.autoMsg, { color: colors.mutedForeground }]}>
              {perSide.length > 0 ? 'Armada a mano' : 'Escribí un objetivo o tocá discos abajo'}
            </Text>
          )}
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
  barCard: { borderRadius: 18, padding: 16, marginTop: 6 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  total: { fontSize: 20, fontFamily: 'Anton_400Regular' },
  clear: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  autoMsg: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
});
