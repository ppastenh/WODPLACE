import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useListPrs, useMyPosts, usePublicProfile } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

/**
 * Public member profile — reached by tapping someone's name/avatar in
 * Comunidad. Deliberately narrow: identity, join date, PRs, recent posts.
 * Never membership status, plan, payments, contracts, or attendance — those
 * stay admin-only in box-admin's own member detail screen.
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

  const { profile, isLoading: profileLoading } = usePublicProfile(memberId);
  const prs = useListPrs({ userId: memberId }, { query: { enabled: !!memberId } as never });
  const {
    posts,
    isLoading: postsLoading,
  } = useMyPosts(memberId, user?.id);

  const displayName = profile?.name ?? nameParam ?? '—';
  const memberSince = formatMemberSince(profile?.memberSince ?? null);
  const prList = prs.data ?? [];
  const recentPosts = posts.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
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
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          {memberSince && (
            <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
              Miembro desde {memberSince}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRs</Text>
          {prList.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Todavía no tiene PRs registrados.
            </Text>
          ) : (
            prList.map((pr) => (
              <View key={pr.id} style={[styles.prRow, { borderColor: colors.navBorder }]}>
                <Text style={[styles.prLift, { color: colors.foreground }]} numberOfLines={1}>
                  {pr.liftName}
                </Text>
                <Text style={[styles.prWeight, { color: colors.navActive }]}>
                  {pr.weight}
                  <Text style={styles.prUnit}>{pr.unit}</Text>
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Publicaciones recientes
          </Text>
          {postsLoading ? (
            <ActivityIndicator color={colors.navActive} style={{ marginTop: 8 }} />
          ) : recentPosts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Todavía no publicó nada en Comunidad.
            </Text>
          ) : (
            recentPosts.map((post) => (
              <View key={post.id} style={[styles.postPreview, { borderColor: colors.navBorder }]}>
                {post.body ? (
                  <Text style={[styles.postPreviewBody, { color: colors.foreground }]} numberOfLines={3}>
                    {post.body}
                  </Text>
                ) : null}
                {post.imageUris.length > 0 && (
                  <Text style={[styles.postPreviewMeta, { color: colors.mutedForeground }]}>
                    {post.imageUris.length} foto{post.imageUris.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 30, fontFamily: 'Inter_700Bold' },
  name: { marginTop: 12, fontSize: 20, fontFamily: 'Inter_700Bold' },
  memberSince: { marginTop: 4, fontSize: 13, fontFamily: 'Inter_400Regular' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  prLift: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', marginRight: 10 },
  prWeight: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  prUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  postPreview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  postPreviewBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  postPreviewMeta: { marginTop: 6, fontSize: 12, fontFamily: 'Inter_400Regular' },
});
