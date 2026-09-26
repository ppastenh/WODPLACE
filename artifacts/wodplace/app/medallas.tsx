import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAchievements, type AchievementCategory } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatLongDate } from '@/lib/dateUtils';

export default function MedallasScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [categories, setCategories] = useState<AchievementCategory[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getAchievements(user.id)
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, [user?.id]);

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medallas</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tus logros en WODPLACE, por categoría.
        </Text>

        {categories === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          categories.map((cat) => {
            const isOpen = expanded === cat.id;
            const pct = cat.total > 0 ? cat.unlocked / cat.total : 0;
            return (
              <View key={cat.id} style={[styles.card, { backgroundColor: colors.card }]}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : cat.id)}
                  style={styles.cardHeader}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeadingRow}>
                      <Text style={[styles.cardName, { color: colors.foreground }]}>
                        {cat.name.toUpperCase()}
                      </Text>
                      <Text style={[styles.cardCount, { color: colors.mutedForeground }]}>
                        {cat.unlocked}/{cat.total}
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: colors.navActive, width: `${pct * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Feather
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.mutedForeground}
                    style={{ marginLeft: 12 }}
                  />
                </Pressable>

                {isOpen && (
                  <View style={styles.badgeList}>
                    {cat.achievements.map((a) => (
                      <View key={a.id} style={styles.badgeRow}>
                        <View
                          style={[
                            styles.badgeIcon,
                            {
                              backgroundColor: a.unlocked ? colors.navActive : colors.secondary,
                            },
                          ]}
                        >
                          <Feather
                            name={a.icon as React.ComponentProps<typeof Feather>['name']}
                            size={14}
                            color={a.unlocked ? colors.primaryForeground : colors.mutedForeground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.badgeName,
                              { color: a.unlocked ? colors.foreground : colors.mutedForeground },
                            ]}
                          >
                            {a.name}
                          </Text>
                          <Text style={[styles.badgeDescription, { color: colors.mutedForeground }]}>
                            {a.unlocked && a.unlockedAt
                              ? `Desbloqueada el ${formatLongDate(a.unlockedAt.slice(0, 10))}`
                              : a.description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 16 },

  card: { borderRadius: 20, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },

  badgeList: { marginTop: 14, gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badgeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  badgeName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  badgeDescription: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
