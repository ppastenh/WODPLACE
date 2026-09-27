import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getWodHistory, WOD_LEVEL_LABELS, type WodHistoryEntry } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatLongDate } from '@/lib/dateUtils';

function formatResult(entry: WodHistoryEntry): string {
  if (entry.format === 'for_time' && entry.timeSeconds != null) {
    const m = Math.floor(entry.timeSeconds / 60);
    const s = entry.timeSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (entry.format === 'amrap') {
    const parts = [`${entry.rounds ?? 0} rounds`];
    if (entry.reps) parts.push(`+${entry.reps}`);
    return parts.join(' ');
  }
  if (entry.format === 'max_reps') return `${entry.reps ?? 0} reps`;
  return '—';
}

export default function WodHistoryScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const history = useQuery({
    queryKey: ['wod-history', userId],
    queryFn: () => getWodHistory(userId),
    enabled: !!userId,
  });

  // Group by wodId so a repeating hero WOD (e.g. Grace) shows its own mini
  // progress list, most recent first within each group; groups themselves
  // ordered by their most recent entry.
  const groups = useMemo(() => {
    const byWod = new Map<string, { name: string; entries: WodHistoryEntry[] }>();
    for (const r of history.data?.results ?? []) {
      const g = byWod.get(r.wodId) ?? { name: r.name, entries: [] };
      g.entries.push(r);
      byWod.set(r.wodId, g);
    }
    return [...byWod.values()].sort(
      (a, b) => b.entries[0].sessionDate.localeCompare(a.entries[0].sessionDate),
    );
  }, [history.data]);

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Historial de WODs</Text>

        {history.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : groups.length === 0 ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="clock" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Todavía no registraste ningún WOD
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {groups.map((g) => (
              <View key={g.name} style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.wodName, { color: colors.foreground }]}>{g.name}</Text>
                {g.entries.map((entry) => (
                  <View key={entry.id} style={[styles.row, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.result, { color: colors.foreground }]}>{formatResult(entry)}</Text>
                      <Text style={[styles.date, { color: colors.mutedForeground }]}>
                        {formatLongDate(entry.sessionDate)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor:
                            entry.level === 'rx' || entry.level === 'elite' ? colors.successBackground : colors.secondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelChipText,
                          {
                            color:
                              entry.level === 'rx' || entry.level === 'elite' ? colors.success : colors.secondaryForeground,
                          },
                        ]}
                      >
                        {WOD_LEVEL_LABELS[entry.level]}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 8, marginBottom: 16 },

  empty: { alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 28, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'center' },

  card: { borderRadius: 20, padding: 16 },
  wodName: { fontSize: 16, fontFamily: 'Anton_400Regular' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  result: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  date: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  levelChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  levelChipText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
});
