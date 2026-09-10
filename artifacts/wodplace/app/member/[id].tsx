import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useListPrs, useMyPosts, usePublicProfile, type SocialPost } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { PostsGrid, PostDetailModal } from '@/components/PostsGrid';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

/**
 * Public member profile — reached by tapping someone's name/avatar in
 * Comunidad (or "Ver perfil" from box-admin). Deliberately built to look
 * and feel like the athlete's own Perfil screen (app/profile.tsx) — same
 * avatar/name treatment, same rank badge, same posts grid — minus
 * everything that's private to the account owner:
 *   - no "Cuenta Activa/Inactiva" badge (reads as account standing)
 *   - no "Agenda Ahora" / "Agregar código de box" (own-account actions)
 *   - no "Agendado" tab (private schedule; its attendee list also leaks
 *     OTHER people's names) — replaced with a "PRs" tab, itself public
 *   - phrase/avatar shown read-only, no edit affordances
 * Status/plan/payments/contracts stay in box-admin's admin-only screen.
 */

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

export default function MemberProfileScreen() {
  const { id, name: nameParam } = useLocalSearchParams<{ id: string; name?: string }>();
  const memberId = String(id);
  const colors = useColors();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'prs'>('posts');
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [postDetailVisible, setPostDetailVisible] = useState(false);

  const { profile, isLoading: profileLoading } = usePublicProfile(memberId);
  const prs = useListPrs({ userId: memberId }, { query: { enabled: !!memberId } as never });
  const {
    posts,
    isLoading: postsLoading,
    isFetchingNextPage: postsLoadingMore,
    hasMore: postsHasMore,
    fetchNextPage: fetchMorePosts,
  } = useMyPosts(memberId, user?.id);

  const displayName = profile?.name ?? nameParam ?? '—';
  const memberSince = formatMemberSince(profile?.memberSince ?? null);
  const prList = prs.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />

      <View style={styles.profileTopSection}>
        <View style={styles.profileRow}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
              {profileLoading ? (
                <ActivityIndicator color={colors.secondaryForeground} />
              ) : (
                <Text style={[styles.initials, { color: colors.secondaryForeground }]}>
                  {getInitials(displayName)}
                </Text>
              )}
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {displayName}
            </Text>
            {profile?.phrase ? (
              <Text style={[styles.phrase, { color: colors.mutedForeground }]} numberOfLines={1}>
                "{profile.phrase}"
              </Text>
            ) : null}
            {memberSince && (
              <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
                Miembro desde {memberSince}
              </Text>
            )}
          </View>
        </View>

        {profile?.rank && (
          <View style={styles.badgeRow}>
            <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.rankText, { color: colors.secondaryForeground }]}>{profile.rank}</Text>
            </View>
          </View>
        )}

        {/* Tab bar — same mechanic as the owner's Perfil screen */}
        <View style={[styles.tabBar, { borderBottomColor: colors.navBorder }]}>
          <TabButton label="Publicaciones" active={activeTab === 'posts'} onPress={() => setActiveTab('posts')} colors={colors} />
          <TabButton label="PRs" active={activeTab === 'prs'} onPress={() => setActiveTab('prs')} colors={colors} />
        </View>
      </View>

      {activeTab === 'posts' ? (
        <PostsGrid
          posts={posts}
          isLoading={postsLoading}
          isFetchingNextPage={postsLoadingMore}
          hasMore={postsHasMore}
          onFetchNextPage={fetchMorePosts}
          onSelectPost={(post) => {
            setSelectedPost(post);
            setPostDetailVisible(true);
          }}
          emptyTitle="Sin publicaciones aún"
          emptyText={`${displayName} todavía no compartió nada en Comunidad.`}
        />
      ) : (
        <View style={styles.prsContent}>
          {prList.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin PRs registrados</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {displayName} todavía no registró ningún PR.
              </Text>
            </View>
          )}
          {prList.map((pr) => (
            <View key={pr.id} style={[styles.prRow, { borderColor: colors.navBorder }]}>
              <Text style={[styles.prLift, { color: colors.foreground }]} numberOfLines={1}>
                {pr.liftName}
              </Text>
              <Text style={[styles.prWeight, { color: colors.navActive }]}>
                {pr.weight}
                <Text style={styles.prUnit}>{pr.unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      <PostDetailModal
        post={selectedPost}
        visible={postDetailVisible}
        onClose={() => {
          setPostDetailVisible(false);
          setSelectedPost(null);
        }}
      />
    </View>
  );
}

function TabButton({
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
      style={[styles.tab, active && { borderBottomColor: colors.navActive, borderBottomWidth: 2 }]}
    >
      <Text style={[styles.tabText, { color: active ? colors.navActive : colors.navInactive }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileTopSection: { paddingHorizontal: 20, paddingTop: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  phrase: { fontSize: 14, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  memberSince: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  rankText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  prsContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  prLift: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', marginRight: 10 },
  prWeight: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  prUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
