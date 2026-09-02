import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useDeletePr,
  useDeletePrGoal,
  useGetTrainingSettings,
  useListPrGoals,
  useListPrs,
  useUpsertPrGoal,
} from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { RmChart } from '@/components/rm/RmChart';
import { PercentTable } from '@/components/rm/PercentTable';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { fromKg, trimNum, type Unit } from '@/lib/rm/units';

const newId = () =>
  `gl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export default function MovementDetailScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { id } = useLocalSearchParams<{ id: string }>();
  const movementId = String(id);

  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });
  const prs = useListPrs({ userId, movementId }, { query: { enabled: !!userId } as never });
  const goals = useListPrGoals({ userId }, { query: { enabled: !!userId } as never });

  const unit = (settings.data?.preferredUnit ?? 'kg') as Unit;
  const records = React.useMemo(
    () =>
      [...(prs.data ?? [])].sort((a, b) =>
        a.achievedAt === b.achievedAt
          ? a.id.localeCompare(b.id)
          : a.achievedAt.localeCompare(b.achievedAt),
      ),
    [prs.data],
  );
  const liftName = records[0]?.liftName ?? 'Movimiento';
  const bestKg = records.reduce((m, r) => Math.max(m, r.weightKg), 0);
  const goal = (goals.data ?? []).find((g) => g.movementId === movementId) ?? null;

  const deletePr = useDeletePr();
  const upsertGoal = useUpsertPrGoal();
  const deleteGoal = useDeletePrGoal();

  const [goalDraft, setGoalDraft] = React.useState('');
  const [editingGoal, setEditingGoal] = React.useState(false);

  const remaining = goal?.remainingKg != null ? fromKg(goal.remainingKg, unit) : null;

  const saveGoal = () => {
    const t = Number(goalDraft.replace(',', '.'));
    if (!Number.isFinite(t) || t <= 0) {
      Alert.alert('Meta inválida', 'Ingresá un peso mayor que cero.');
      return;
    }
    upsertGoal.mutate(
      {
        data: {
          id: goal?.id ?? newId(),
          userId,
          movementId,
          targetWeight: t,
          targetUnit: unit,
        },
      },
      {
        onSuccess: () => {
          setEditingGoal(false);
          goals.refetch();
        },
      },
    );
  };

  const removeGoal = () => {
    if (!goal) return;
    deleteGoal.mutate({ id: goal.id }, { onSuccess: () => goals.refetch() });
  };

  const removeRecord = (recordId: string) => {
    Alert.alert('Borrar registro', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => deletePr.mutate({ id: recordId }, { onSuccess: () => prs.refetch() }),
      },
    ]);
  };

  if (prs.isLoading || settings.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RmHeader title="Movimiento" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader
        title={liftName}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() =>
              router.push(`/rm/record?movementId=${movementId}&movementName=${encodeURIComponent(liftName)}`)
            }
            hitSlop={10}
          >
            <Feather name="plus" size={22} color={colors.primary} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.rmCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.rmLabel, { color: colors.mutedForeground }]}>RM actual</Text>
          <Text style={[styles.rmValue, { color: colors.foreground }]}>
            {bestKg > 0 ? `${trimNum(fromKg(bestKg, unit), 1)} ${unit}` : '—'}
          </Text>
          <Pressable
            onPress={() =>
              router.push(`/rm/tools/bar-loader?prefillKg=${bestKg.toFixed(2)}`)
            }
            style={styles.barLink}
          >
            <Feather name="sliders" size={13} color={colors.primary} />
            <Text style={[styles.barLinkText, { color: colors.primary }]}>Cargar barra para este peso</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>Evolución</Text>
        <RmChart
          points={records.map((r) => ({ date: r.achievedAt, kg: r.weightKg }))}
          unitLabel={unit}
          toDisplay={(kg) => fromKg(kg, unit)}
        />

        {/* Meta */}
        <View style={styles.sectionRow}>
          <Text style={[styles.section, { color: colors.foreground }]}>Meta</Text>
          {goal && !editingGoal ? (
            <Pressable onPress={removeGoal} hitSlop={8}>
              <Text style={[styles.smallLink, { color: colors.mutedForeground }]}>Quitar</Text>
            </Pressable>
          ) : null}
        </View>
        {editingGoal ? (
          <View style={styles.goalEdit}>
            <TextInput
              style={[
                styles.goalInput,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
              value={goalDraft}
              onChangeText={setGoalDraft}
              keyboardType="decimal-pad"
              placeholder={`Meta en ${unit}`}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <Pressable onPress={saveGoal} style={[styles.goalBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.goalBtnText, { color: colors.primaryForeground }]}>Guardar</Text>
            </Pressable>
            <Pressable onPress={() => setEditingGoal(false)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : goal ? (
          <Pressable
            onPress={() => {
              setGoalDraft(trimNum(fromKg(goal.targetWeightKg, unit), 1));
              setEditingGoal(true);
            }}
            style={[styles.goalCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.goalTarget, { color: colors.foreground }]}>
              Objetivo {trimNum(fromKg(goal.targetWeightKg, unit), 1)} {unit}
            </Text>
            <Text style={[styles.goalDelta, { color: colors.primary }]}>
              {remaining != null && remaining > 0
                ? `Faltan ${trimNum(remaining, 1)} ${unit}`
                : '🎯 Alcanzada'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              setGoalDraft('');
              setEditingGoal(true);
            }}
            style={[styles.goalAdd, { borderColor: colors.border }]}
          >
            <Feather name="target" size={15} color={colors.primary} />
            <Text style={[styles.goalAddText, { color: colors.primary }]}>Marcar una meta</Text>
          </Pressable>
        )}

        {/* Tabla de porcentajes */}
        {bestKg > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.foreground }]}>
              Porcentajes del RM
            </Text>
            <PercentTable baseWeight={fromKg(bestKg, unit)} unit={unit} />
          </>
        ) : null}

        {/* Registros */}
        <Text style={[styles.section, { color: colors.foreground }]}>Registros</Text>
        <View style={{ gap: 8 }}>
          {[...records].reverse().map((r) => (
            <View key={r.id} style={[styles.rec, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recWeight, { color: colors.foreground }]}>
                  {trimNum(r.weight, 2)} {r.unit}
                  {r.unit !== unit ? (
                    <Text style={{ color: colors.mutedForeground }}>
                      {'  '}({trimNum(fromKg(r.weightKg, unit), 1)} {unit})
                    </Text>
                  ) : null}
                </Text>
                <Text style={[styles.recDate, { color: colors.mutedForeground }]}>{r.achievedAt}</Text>
                {r.note ? (
                  <Text style={[styles.recNote, { color: colors.mutedForeground }]}>{r.note}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeRecord(r.id)} hitSlop={10}>
                <Feather name="trash-2" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 44, gap: 12 },
  rmCard: { borderRadius: 18, padding: 18, gap: 4 },
  rmLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  rmValue: { fontSize: 34, fontFamily: 'Anton_400Regular' },
  barLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  barLinkText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  section: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 8 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  smallLink: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  goalEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  goalBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  goalBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  goalCard: { borderRadius: 14, padding: 14, gap: 3 },
  goalTarget: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  goalDelta: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  goalAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  goalAddText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  rec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  recWeight: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  recDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  recNote: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3, fontStyle: 'italic' },
});
