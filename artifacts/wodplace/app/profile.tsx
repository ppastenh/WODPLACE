import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { AppButton } from '@/components/AppButton';
import { PostsGrid, PostDetailModal } from '@/components/PostsGrid';
import { EditPhraseModal } from '@/components/EditPhraseModal';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { AttendeesModal } from '@/components/AttendeesModal';
import { CancelConfirmModal } from '@/components/CancelConfirmModal';
import { ClassCard, AgendadoBadge } from '@/components/ClassCard';
import { useAuth } from '@/context/AuthContext';
import { useBooking, ClassSession } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { useMyPosts, uploadAvatarImage, type SocialPost } from '@workspace/api-client-react';
import { getAdminNavItem, shouldShowContracts } from '@/lib/navigation';

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
  { key: 'more', label: 'Más', icon: 'grid', route: '/more' },
];

// ─── ProfileScreen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const { user, adminStatus, hasBoxMembership, updateProfile, logout } = useAuth();
  const { now, getUpcomingBooked, getAttendeeNames, cancel } = useBooking();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();

  const [phraseVisible, setPhraseVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [attendeesSession, setAttendeesSession] = useState<ClassSession | null>(null);
  const [cancelSession, setCancelSession] = useState<ClassSession | null>(null);
  const [activeTab, setActiveTab] = useState<'agendado' | 'posts'>('agendado');
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [postDetailVisible, setPostDetailVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    posts: myPosts,
    isLoading: postsLoading,
    isFetchingNextPage: postsLoadingMore,
    hasMore: postsHasMore,
    fetchNextPage: fetchMorePosts,
  } = useMyPosts(user?.id ?? '');

  if (!user) return null;

  const bookedSessions = getUpcomingBooked(10);

  const adminNavItem = getAdminNavItem(adminStatus);
  // Contratos Activos and Plan only make sense once the athlete belongs to
  // a box — an admin role has the platform agreement instead (adminNavItem
  // above), not either of these.
  const showContracts = shouldShowContracts(adminStatus, hasBoxMembership);
  const navItems: DrawerNavItem[] = NAV_ITEMS.filter(
    (item) =>
      (item.key !== 'more' || adminNavItem?.key === 'admin') &&
      ((item.key !== 'contracts' && item.key !== 'plan') || showContracts),
  ).map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  }));
  if (adminNavItem) {
    navItems.push(adminNavItem);
  }

  const handleNavigate = (route: string) => {
    setDrawerVisible(false);
    if (route !== pathname) router.push(route as never);
  };

  const handleAvatarChange = async (localUri: string) => {
    setAvatarUploading(true);
    try {
      const mime = localUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const nativeUploader = Platform.OS !== 'web'
        ? async (uploadURL: string, fileUri: string, contentType: string) => {
            const result = await FileSystem.uploadAsync(uploadURL, fileUri, {
              httpMethod: 'PUT',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: { 'Content-Type': contentType },
            });
            if (result.status < 200 || result.status >= 300) {
              throw new Error(`La imagen no se pudo subir (HTTP ${result.status}). Intenta de nuevo.`);
            }
          }
        : undefined;
      const remoteUrl = await uploadAvatarImage(user.id, localUri, mime, nativeUploader);
      await updateProfile({ avatarUri: remoteUrl });
    } catch (err) {
      console.warn('Avatar upload failed:', err);
      Alert.alert('Error al subir foto', 'No pudimos actualizar tu foto de perfil. Intenta de nuevo.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    await logout();
    router.replace('/login');
  };

  const handleConfirmCancel = async () => {
    if (!cancelSession) return;
    await cancel(cancelSession);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setCancelSession(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />

      {/* ── Profile top — always rendered, never unmounts ── */}
      <View style={[styles.profileTopSection, { backgroundColor: colors.background }]}>
        <View style={styles.profileRow}>
          <View>
            <Avatar uri={user.avatarUri} onChange={handleAvatarChange} />
            {avatarUploading && (
              <View style={styles.avatarUploadingOverlay} pointerEvents="none">
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {user.name}
            </Text>
            <Pressable onPress={() => setPhraseVisible(true)} style={styles.phraseRow} hitSlop={6}>
              <Text
                style={[
                  styles.phrase,
                  { color: colors.mutedForeground },
                  !user.phrase && styles.phrasePlaceholder,
                ]}
                numberOfLines={1}
              >
                {user.phrase ? `"${user.phrase}"` : '"Inserte texto"'}
              </Text>
              <Feather name="edit-2" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.badgeRow}>
          {user.status === 'active' ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Cuenta Activa</Text>
            </View>
          ) : (
            // Soft, not alarming — this isn't an error state, just a nudge
            // to go finish Contratos Activos.
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(224, 82, 74, 0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.statusText, { color: colors.destructive }]}>Cuenta no activa</Text>
            </View>
          )}
          <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.rankText, { color: colors.secondaryForeground }]}>{user.rank}</Text>
          </View>
        </View>

        <AppButton
          label="Agenda Ahora"
          variant="dark"
          fullWidth
          onPress={() => router.push('/calendar')}
          style={styles.scheduleButton}
          icon={<Feather name="calendar" size={18} color={colors.authText} />}
        />

        {/* Tab bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.navBorder }]}>
          <Pressable
            onPress={() => setActiveTab('agendado')}
            style={[
              styles.tab,
              activeTab === 'agendado' && {
                borderBottomColor: colors.navActive,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'agendado' ? colors.navActive : colors.navInactive },
              ]}
            >
              Agendado
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('posts')}
            style={[
              styles.tab,
              activeTab === 'posts' && {
                borderBottomColor: colors.navActive,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'posts' ? colors.navActive : colors.navInactive },
              ]}
            >
              Mis publicaciones
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Tab content (scrollable, below the fixed ProfileTop) ── */}
      {activeTab === 'agendado' ? (
        <ScrollView
          contentContainerStyle={styles.agendadoContent}
          showsVerticalScrollIndicator={false}
        >
          {bookedSessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Aún no tienes clases agendadas
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Toca "Agenda Ahora" para reservar tu próximo WOD.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {bookedSessions.map((session) => (
                <ClassCard
                  key={session.id}
                  session={session}
                  now={now}
                  showDayLabel
                  onPressAttendees={() => setAttendeesSession(session)}
                  actionSlot={
                    <AgendadoBadge
                      canCancel={session.canCancel}
                      active={cancelSession?.id === session.id}
                      onRequestCancel={() => setCancelSession(session)}
                    />
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <PostsGrid
          posts={myPosts}
          isLoading={postsLoading}
          isFetchingNextPage={postsLoadingMore}
          hasMore={postsHasMore}
          onFetchNextPage={fetchMorePosts}
          onSelectPost={(post) => {
            setSelectedPost(post);
            setPostDetailVisible(true);
          }}
        />
      )}

      <CancelConfirmModal
        visible={!!cancelSession}
        onClose={() => setCancelSession(null)}
        onConfirm={handleConfirmCancel}
      />
      <EditPhraseModal
        visible={phraseVisible}
        onClose={() => setPhraseVisible(false)}
        initialValue={user.phrase}
        onSave={(value) => updateProfile({ phrase: value })}
      />
      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onOpen={() => setDrawerVisible(true)}
        onNavigate={handleNavigate}
        currentRoute={pathname}
        userName={user.name}
        avatarUri={user.avatarUri}
        navItems={navItems}
        onLogout={handleLogout}
      />
      <AttendeesModal
        visible={!!attendeesSession}
        onClose={() => setAttendeesSession(null)}
        session={attendeesSession}
        names={attendeesSession ? getAttendeeNames(attendeesSession, user.name) : []}
      />
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

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Profile top — fixed, outside scroll containers
  profileTopSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 6 },
  name: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  phraseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phrase: { fontSize: 14, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  phrasePlaceholder: { opacity: 0.7 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFFFFF' },
  statusText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  rankText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scheduleButton: { marginTop: 24, marginBottom: 6 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Agendado tab
  agendadoContent: { paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 },
  list: { gap: 12 },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
