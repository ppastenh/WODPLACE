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
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { computeBarLoad, type PlateSpec } from '@/lib/rm/barLoad';
import { fromKg, toKg, trimNum, type Unit } from '@/lib/rm/units';

type Sex = 'f' | 'm' | 'x';

export default function BarLoaderScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { prefillKg } = useLocalSearchParams<{ prefillKg?: string }>();

  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });

  const [unit, setUnit] = React.useState<Unit>('kg');
  const [sex, setSex] = React.useState<Sex>('m');
  const [barKg, setBarKg] = React.useState<number>(20);
  const [target, setTarget] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  // Seed from settings once.
  React.useEffect(() => {
    if (!settings.data || touched) return;
    setUnit((settings.data.preferredUnit ?? 'kg') as Unit);
    if (settings.data.sex) setSex(settings.data.sex as Sex);
    setBarKg(toKg(settings.data.barWeight, settings.data.barUnit as Unit));
  }, [settings.data, touched]);

  // Prefill target from a movement's RM (passed in kg).
  React.useEffect(() => {
    if (prefillKg && !touched && settings.data) {
      const u = (settings.data.preferredUnit ?? 'kg') as Unit;
      setTarget(trimNum(fromKg(Number(prefillKg), u), 1));
    }
  }, [prefillKg, settings.data, touched]);

  const plates: PlateSpec[] = (settings.data?.plates ?? []) as PlateSpec[];
  const targetNum = Number(target.replace(',', '.'));
  const valid = Number.isFinite(targetNum) && targetNum > 0;
  const result = valid
    ? computeBarLoad(targetNum, unit, barKg, 'kg', plates)
    : null;

  const setBar = (kg: number) => {
    setTouched(true);
    setBarKg(kg);
  };

  if (settings.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RmHeader title="Carga de barra" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Carga de barra" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Barra + sexo */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Barra</Text>
        <View style={styles.pillRow}>
          {[
            { kg: 20, label: '20 kg' },
            { kg: 15, label: '15 kg' },
          ].map((b) => (
            <Pressable
              key={b.kg}
              onPress={() => setBar(b.kg)}
              style={[
                styles.pill,
                {
                  backgroundColor: Math.abs(barKg - b.kg) < 0.1 ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: Math.abs(barKg - b.kg) < 0.1 ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Sexo (barra por defecto)</Text>
        <View style={styles.pillRow}>
          {(
            [
              { v: 'f', label: 'F · 15 kg' },
              { v: 'm', label: 'M · 20 kg' },
              { v: 'x', label: 'Otro' },
            ] as Array<{ v: Sex; label: string }>
          ).map((s) => (
            <Pressable
              key={s.v}
              onPress={() => {
                setSex(s.v);
                if (s.v === 'f') setBar(15);
                if (s.v === 'm') setBar(20);
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: sex === s.v ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: sex === s.v ? colors.primaryForeground : colors.foreground }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Peso objetivo */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Peso total</Text>
        <View style={styles.targetRow}>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            value={target}
            onChangeText={(t) => {
              setTouched(true);
              setTarget(t);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={[styles.toggle, { borderColor: colors.border }]}>
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  setTouched(true);
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

        {result ? (
          result.error ? (
            <Text style={[styles.warn, { color: colors.destructive }]}>{result.error}</Text>
          ) : (
            <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
              <BarLoadDiagram perSide={result.perSide} />
              <View style={{ marginTop: 12 }}>
                {result.exact ? (
                  <Text style={[styles.exact, { color: colors.primary }]}>
                    Exacto: {trimNum(result.loadedKg, 2)} kg
                    {unit === 'lb' ? ` (${trimNum(fromKg(result.loadedKg, 'lb'), 1)} lb)` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.close, { color: colors.mutedForeground }]}>
                    Lo más cercano: {trimNum(result.loadedKg, 2)} kg
                    {' · '}
                    {result.remainderKg > 0
                      ? `faltan ${trimNum(result.remainderKg, 2)} kg`
                      : `te pasás ${trimNum(-result.remainderKg, 2)} kg`}
                  </Text>
                )}
              </View>
            </View>
          )
        ) : (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Ingresá el peso total que querés levantar.
          </Text>
        )}

        <Pressable
          onPress={() => router.push('/rm/settings/plates')}
          style={[styles.platesLink, { borderColor: colors.border }]}
        >
          <Feather name="grid" size={14} color={colors.primary} />
          <Text style={[styles.platesLinkText, { color: colors.primary }]}>
            Configurar discos disponibles
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 10, paddingBottom: 44 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  resultCard: { borderRadius: 18, padding: 16, marginTop: 6 },
  exact: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  close: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  warn: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 },
  platesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  platesLinkText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
