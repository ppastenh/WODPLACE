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
  useListPrGoals,
  useListPrs,
} from '@workspace/api-client-react';
import { RmHeader } from '@/components/rm/RmHeader';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { fromKg, trimNum, type Unit } from '@/lib/rm/units';

export default function RmHistoryScreen() {
  const colors = useDarkColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const settings = useGetTrainingSettings({ userId }, { query: { enabled: !!userId } as never });
  const prs = useListPrs({ userId }, { query: { enabled: !!userId } as never });
  const goals = useListPrGoals({ userId }, { query: { enabled: !!userId } as never });

  const unit = (settings.data?.preferredUnit ?? 'kg') as Unit;

  const rows = React.useMemo(() => {
    const byMovement = new Map<
      string,
      { movementId: string; liftName: string; bestKg: number; lastDate: string; count: number }
    >();
    for (const p of prs.data ?? []) {
      const cur = byMovement.get(p.movementId);
      if (!cur) {
        byMovement.set(p.movementId, {
          movementId: p.movementId,
          liftName: p.liftName,
          bestKg: p.weightKg,
          lastDate: p.achievedAt,
          count: 1,
        });
      } else {
        cur.bestKg = Math.max(cur.bestKg, p.weightKg);
        if (p.achievedAt > cur.lastDate) cur.lastDate = p.achievedAt;
        cur.count += 1;
      }
    }
    const goalByMovement = new Map((goals.data ?? []).map((g) => [g.movementId, g]));
    return [...byMovement.values()]
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      .map((r) => ({ ...r, goal: goalByMovement.get(r.movementId) ?? null }));
  }, [prs.data, goals.data]);

  const loading = prs.isLoading || settings.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RmHeader title="Mis RM" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.push('/rm/record')}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Registrar RM</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : rows.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="bar-chart-2" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Todavía no cargaste ningún RM
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Registrá tu primer levantamiento para ver el historial y la evolución.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r) => {
              const best = fromKg(r.bestKg, unit);
              const remaining =
                r.goal?.remainingKg != null ? fromKg(r.goal.remainingKg, unit) : null;
              return (
                <Pressable
                  key={r.movementId}
                  onPress={() => router.push(`/rm/movement/${r.movementId}`)}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: colors.card },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {r.liftName}
                    </Text>
                    <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                      {r.count} {r.count === 1 ? 'registro' : 'registros'} · último {r.lastDate}
                    </Text>
                    {r.goal ? (
                      <Text style={[styles.cardGoal, { color: colors.primary }]}>
                        {remaining && remaining > 0
                          ? `Faltan ${trimNum(remaining, 1)} ${unit} para la meta`
                          : '🎯 Meta alcanzada'}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardRm, { color: colors.foreground }]}>
                      {trimNum(best, 1)}
                    </Text>
                    <Text style={[styles.cardUnit, { color: colors.mutedForeground }]}>{unit}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
  },
  ctaText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  empty: {
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 28,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  cardMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  cardGoal: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardRm: { fontSize: 20, fontFamily: 'Anton_400Regular' },
  cardUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
