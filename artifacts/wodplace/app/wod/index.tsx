import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayWod, submitWodResult, SKILL_LEVEL_LABELS, type WodFormat } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const FORMAT_LABELS: Record<WodFormat, string> = {
  for_time: 'For Time',
  amrap: 'AMRAP',
  max_reps: 'Max Reps',
};

export default function WodScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const qc = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ['wod-today', userId],
    queryFn: () => getTodayWod(userId),
    enabled: !!userId,
  });
  const wod = todayQuery.data?.wod ?? null;

  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  // Auto-filled from the athlete's assigned level (coach-set in box-admin) —
  // no manual picker. Falls back to 'beginner' for the small number of
  // legacy accounts whose rank was never set.
  const level = user?.rank ?? 'beginner';

  // Prefill from an already-logged result (edit mode) whenever today's WOD
  // data (re)loads — e.g. right after this screen's own submit resolves.
  useEffect(() => {
    const r = wod?.myResult;
    if (!r) return;
    if (r.timeSeconds != null) {
      setMinutes(String(Math.floor(r.timeSeconds / 60)));
      setSeconds(String(r.timeSeconds % 60).padStart(2, '0'));
    }
    if (r.rounds != null) setRounds(String(r.rounds));
    if (r.reps != null) setReps(String(r.reps));
    setNotes(r.notes ?? '');
  }, [wod?.myResult]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!wod) return;
      const timeSeconds =
        wod.format === 'for_time' && (minutes || seconds)
          ? Number(minutes || 0) * 60 + Number(seconds || 0)
          : undefined;
      await submitWodResult({
        userId,
        wodOfDayId: wod.wodOfDayId,
        timeSeconds,
        rounds: wod.format !== 'for_time' && rounds ? Number(rounds) : undefined,
        reps: wod.format !== 'for_time' && reps ? Number(reps) : undefined,
        level,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wod-today', userId] });
    },
  });

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>WOD de hoy</Text>
          <Pressable onPress={() => router.push('/wod/history' as never)} hitSlop={8}>
            <Text style={[styles.historyLink, { color: colors.navActive }]}>Historial</Text>
          </Pressable>
        </View>

        {todayQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !wod ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="zap" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Tu box todavía no publicó el WOD de hoy
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Vuelve más tarde o consúltale a tu coach.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeadingRow}>
                <Text style={[styles.wodName, { color: colors.foreground }]}>{wod.name}</Text>
                <View style={[styles.formatChip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.formatChipText, { color: colors.secondaryForeground }]}>
                    {FORMAT_LABELS[wod.format]}
                    {wod.timeCapMinutes ? ` · ${wod.timeCapMinutes}'` : ''}
                  </Text>
                </View>
              </View>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{wod.description}</Text>
              {wod.notes && (
                <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>{wod.notes}</Text>
                </View>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {wod.myResult ? 'Tu resultado' : 'Registrar resultado'}
              </Text>

              {wod.format === 'for_time' ? (
                <View style={styles.timeRow}>
                  <TimeField label="min" value={minutes} onChangeText={setMinutes} colors={colors} />
                  <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>:</Text>
                  <TimeField label="seg" value={seconds} onChangeText={setSeconds} colors={colors} />
                </View>
              ) : wod.format === 'amrap' ? (
                <View style={styles.timeRow}>
                  <TimeField label="rounds" value={rounds} onChangeText={setRounds} colors={colors} wide />
                  <TimeField label="reps extra" value={reps} onChangeText={setReps} colors={colors} wide />
                </View>
              ) : (
                <View style={styles.timeRow}>
                  <TimeField label="reps totales" value={reps} onChangeText={setReps} colors={colors} wide />
                </View>
              )}

              <View style={[styles.levelRow, { backgroundColor: colors.secondary }]}>
                <Feather name="award" size={14} color={colors.secondaryForeground} />
                <Text style={[styles.levelRowText, { color: colors.secondaryForeground }]}>
                  Nivel: {SKILL_LEVEL_LABELS[level]}
                </Text>
              </View>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas (opcional)"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border }]}
              />

              <Pressable
                onPress={() => submit.mutate()}
                disabled={submit.isPending}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  (pressed || submit.isPending) && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                  {submit.isPending ? 'Guardando...' : wod.myResult ? 'Actualizar resultado' : 'Guardar resultado'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TimeField({
  label,
  value,
  onChangeText,
  colors,
  wide,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  wide?: boolean;
}) {
  return (
    <View style={{ flex: wide ? 1 : undefined, alignItems: 'center' }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.timeInput,
          wide && { width: '100%' },
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
        ]}
      />
      <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  historyLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  empty: { alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 28, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },

  card: { borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  wodName: { fontSize: 18, fontFamily: 'Anton_400Regular', flexShrink: 1 },
  formatChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  formatChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  description: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginTop: 8 },
  notesBox: { borderRadius: 12, padding: 10, marginTop: 10 },
  notesText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  timeInput: {
    width: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
  },
  timeSep: { fontSize: 20, fontFamily: 'Anton_400Regular' },
  timeLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 4 },

  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  levelRowText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  notesInput: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  submitBtn: { marginTop: 14, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
