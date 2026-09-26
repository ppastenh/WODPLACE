import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import {
  useGetTrainingSettings,
  useUpsertTrainingSettings,
  type TrainingSettings,
} from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { Unit } from '@/lib/rm/units';

export default function RmSettingsScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });
  const upsert = useUpsertTrainingSettings();

  // Local text buffer so the field doesn't fight the user while typing
  // ("70" -> "70." -> "70.5") — commits to the server onBlur, not on every
  // keystroke. Re-synced whenever the server value changes underneath us
  // (e.g. right after this same screen's own save resolves).
  const [bodyweightInput, setBodyweightInput] = useState('');
  useEffect(() => {
    setBodyweightInput(settings.data?.bodyweightKg != null ? String(settings.data.bodyweightKg) : '');
  }, [settings.data?.bodyweightKg]);

  const save = (patch: Partial<TrainingSettings>) => {
    const cur = settings.data;
    if (!cur) return;
    upsert.mutate(
      {
        data: {
          userId,
          preferredUnit: cur.preferredUnit,
          barWeight: cur.barWeight,
          barUnit: cur.barUnit,
          plates: cur.plates,
          ...patch,
        },
      },
      { onSuccess: () => settings.refetch() },
    );
  };

  if (settings.isLoading || !settings.data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RmHeader title="Ajustes" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const s = settings.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* No onBack — tab root of RmBottomNav; see history.tsx for why. */}
      <RmHeader title="Ajustes" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Unidad preferida</Text>
        <View style={[styles.toggle, { borderColor: colors.border }]}>
          {(['kg', 'lb'] as Unit[]).map((u) => (
            <Pressable
              key={u}
              onPress={() => save({ preferredUnit: u })}
              style={[styles.toggleBtn, { backgroundColor: s.preferredUnit === u ? colors.primary : 'transparent' }]}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: s.preferredUnit === u ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {u}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Peso corporal</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Siempre en kg — se usa para las medallas de fuerza relativa (ej. sentadilla 1.5x tu peso).
        </Text>
        <View style={[styles.bodyweightRow, { borderColor: colors.border }]}>
          <TextInput
            value={bodyweightInput}
            onChangeText={setBodyweightInput}
            onBlur={() => {
              const trimmed = bodyweightInput.trim().replace(',', '.');
              const parsed = trimmed ? Number(trimmed) : null;
              save({ bodyweightKg: parsed != null && !Number.isNaN(parsed) && parsed > 0 ? parsed : null });
            }}
            keyboardType="decimal-pad"
            placeholder="Ej. 72"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.bodyweightInput, { color: colors.foreground }]}
          />
          <Text style={[styles.bodyweightUnit, { color: colors.mutedForeground }]}>kg</Text>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Mi barra</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          La que usás siempre. La calculadora arranca con ésta seleccionada.
        </Text>
        <View style={styles.pillRow}>
          {[20, 15].map((kg) => (
            <Pressable
              key={kg}
              onPress={() => save({ barWeight: kg, barUnit: 'kg' })}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    s.barUnit === 'kg' && Math.abs(s.barWeight - kg) < 0.1 ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color:
                      s.barUnit === 'kg' && Math.abs(s.barWeight - kg) < 0.1
                        ? colors.primaryForeground
                        : colors.foreground,
                  },
                ]}
              >
                {kg} kg
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/rm/settings/plates' as never)}
          style={[styles.link, { backgroundColor: colors.card }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="grid" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: colors.foreground }]}>Discos disponibles</Text>
            <Text style={[styles.linkHint, { color: colors.mutedForeground }]}>
              {s.plates.length} tamaños configurados
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 10, paddingBottom: 40 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  toggle: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  toggleBtn: { paddingHorizontal: 24, paddingVertical: 10 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  bodyweightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  bodyweightInput: { fontSize: 16, fontFamily: 'Inter_600SemiBold', paddingVertical: 8, flex: 1 },
  bodyweightUnit: { fontSize: 13, fontFamily: 'Inter_500Medium', marginLeft: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  linkHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
