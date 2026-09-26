import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getAchievements, type AchievementCategory } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { MedalBadge } from '@/components/MedalBadge';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatLongDate } from '@/lib/dateUtils';

const MEDAL_SIZE = 76;
const GRID_GAP = 14;

export default function MedallasScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [categories, setCategories] = useState<AchievementCategory[] | null>(null);
  const [tab, setTab] = useState<string>('all');

  // Right-edge fade on the category tabs — hints that the row scrolls
  // horizontally. Hidden once there's nothing left to scroll to (either the
  // chips already fit, or the user scrolled all the way to the end).
  const [tabsContainerWidth, setTabsContainerWidth] = useState(0);
  const [tabsContentWidth, setTabsContentWidth] = useState(0);
  const [tabsScrollX, setTabsScrollX] = useState(0);
  const canScrollTabsRight = tabsContentWidth - tabsContainerWidth - tabsScrollX > 4;
  const onTabsScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setTabsScrollX(e.nativeEvent.contentOffset.x);
  };

  // One-time "peek" bounce the first time the row can actually scroll, so
  // the cut-off tab isn't the only hint — a little nudge draws the eye to it
  // before the user has to notice on their own.
  const tabsScrollRef = useRef<ScrollView>(null);
  const hasBounced = useRef(false);
  useEffect(() => {
    if (hasBounced.current || !canScrollTabsRight) return;
    hasBounced.current = true;
    const t = setTimeout(() => {
      tabsScrollRef.current?.scrollTo({ x: 44, animated: true });
      setTimeout(() => tabsScrollRef.current?.scrollTo({ x: 0, animated: true }), 380);
    }, 500);
    return () => clearTimeout(t);
  }, [canScrollTabsRight]);

  useEffect(() => {
    if (!user?.id) return;
    getAchievements(user.id)
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, [user?.id]);

  const visibleCategories = useMemo(() => {
    if (!categories) return [];
    return tab === 'all' ? categories : categories.filter((c) => c.id === tab);
  }, [categories, tab]);

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medallas</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tus logros en WODPLACE, por categoría.
        </Text>
      </View>

      {categories === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.tabsWrapper} onLayout={(e) => setTabsContainerWidth(e.nativeEvent.layout.width)}>
            <ScrollView
              ref={tabsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
              style={styles.tabsScroll}
              onScroll={onTabsScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(w) => setTabsContentWidth(w)}
            >
              <TabChip label="Todas" active={tab === 'all'} onPress={() => setTab('all')} colors={colors} />
              {categories.map((cat) => (
                <TabChip
                  key={cat.id}
                  label={cat.name}
                  active={tab === cat.id}
                  onPress={() => setTab(cat.id)}
                  colors={colors}
                />
              ))}
            </ScrollView>
            {canScrollTabsRight && (
              <LinearGradient
                colors={[`${colors.background}00`, `${colors.background}D9`, colors.background]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                pointerEvents="none"
                style={styles.tabsFade}
              />
            )}
          </View>

          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {visibleCategories.map((cat) => {
              const pct = cat.total > 0 ? cat.unlocked / cat.total : 0;
              return (
                <View key={cat.id} style={styles.section}>
                  <View style={styles.sectionHeadingRow}>
                    <Text style={[styles.sectionName, { color: colors.foreground }]}>
                      {cat.name.toUpperCase()}
                    </Text>
                    <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
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

                  <View style={styles.grid}>
                    {cat.achievements.map((a) => (
                      <View key={a.id} style={styles.gridItem}>
                        <MedalBadge icon={a.icon} unlocked={a.unlocked} size={MEDAL_SIZE} />
                        <Text
                          style={[
                            styles.medalName,
                            { color: a.unlocked ? colors.foreground : colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {a.name}
                        </Text>
                        <Text style={[styles.medalDetail, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {a.unlocked && a.unlockedAt
                            ? formatLongDate(a.unlockedAt.slice(0, 10))
                            : a.description}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function TabChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabChip,
        { backgroundColor: active ? colors.navActive : colors.secondary },
      ]}
    >
      <Text
        style={[
          styles.tabChipText,
          { color: active ? colors.primaryForeground : colors.secondaryForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBlock: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 14 },

  // flexGrow/flexShrink: 0 so this row always sizes to its own content
  // (the chips) — without it, this ScrollView and the grid ScrollView below
  // compete for vertical space with no explicit split, and whichever one's
  // content is taller (e.g. "Todas"/"PR" vs. "Constancia") would end up
  // squeezing the other. gridScroll's flex: 1 is the other half of that fix:
  // it's the only one allowed to grow/shrink, so the tabs row never does.
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  // paddingRight deliberately much smaller than paddingLeft (not symmetric)
  // — a big trailing margin would let the last chip end cleanly inside its
  // own whitespace, which reads as "that's everything." With almost no
  // trailing padding, the row's true content edge sits right at the
  // viewport edge, so whichever chip lands there gets visibly sliced by the
  // screen boundary instead of politely finishing beforehand — the same
  // half-cut-tab convention Instagram/Twitter's filter bars use.
  tabsRow: { paddingLeft: 20, paddingRight: 4, gap: 8, paddingBottom: 14 },
  tabChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  tabChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  tabsWrapper: { flexGrow: 0, flexShrink: 0 },
  // Hints there are more tabs to the right without a visible scrollbar —
  // fades to the screen background over the last bit of the row, hidden once
  // there's nothing left to scroll to (see canScrollTabsRight). Wider and
  // more opaque than a "subtle" fade on purpose — it needs to actually read
  // as a cue, not just soften an edge.
  tabsFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 56 },

  gridScroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionName: { fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  sectionCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  progressFill: { height: '100%', borderRadius: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridItem: { width: MEDAL_SIZE + 20, alignItems: 'center' },
  medalName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 6, textAlign: 'center' },
  medalDetail: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, textAlign: 'center' },
});
