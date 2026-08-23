import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { AppButton } from '@/components/AppButton';
import { EditPhraseModal } from '@/components/EditPhraseModal';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { AttendeesModal } from '@/components/AttendeesModal';
import { CancelConfirmModal } from '@/components/CancelConfirmModal';
import { ClassCard, AgendadoBadge } from '@/components/ClassCard';
import { useAuth } from '@/context/AuthContext';
import { useBooking, ClassSession } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { useMyPosts, type SocialPost } from '@workspace/api-client-react';

const WIN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
// 3 columns, full width, with gaps between them
const ITEM_SIZE = Math.floor((WIN_WIDTH - GRID_GAP * 2) / 3);

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
  { key: 'admin', label: 'Panel de administración', icon: 'shield', route: '/admin-login' },
];

// ─── PostThumb ────────────────────────────────────────────────────────────────

function PostThumb({
  post,
  onPress,
  colors,
}: {
  post: SocialPost;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const hasImage = post.imageUris.length > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.postThumb,
        { width: ITEM_SIZE, height: ITEM_SIZE, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {hasImage ? (
        <Image
          source={{ uri: post.imageUris[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.postThumbTextWrap,
            { backgroundColor: colors.card, borderColor: colors.navBorder },
          ]}
        >
          <Text
            style={[styles.postThumbBody, { color: colors.mutedForeground }]}
            numberOfLines={5}
          >
            {post.body}
          </Text>
        </View>
      )}
      {post.imageUris.length > 1 && (
        <View style={[styles.multiImgBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Feather name="layers" size={10} color="#fff" />
          <Text style={styles.multiImgText}>{post.imageUris.length}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── PostDetailModal ──────────────────────────────────────────────────────────

function PostDetailModal({
  post,
  visible,
  onClose,
  colors,
}: {
  post: SocialPost | null;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (!post) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
          <Pressable onPress={onClose} style={styles.detailClose} hitSlop={14}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            <Text style={[styles.detailAuthor, { color: colors.foreground }]}>
              {post.authorName}
            </Text>
            <Text style={[styles.detailTime, { color: colors.navInactive }]}>
              {new Date(post.createdAt).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            {post.body ? (
              <Text style={[styles.detailBody, { color: colors.foreground }]}>{post.body}</Text>
            ) : null}
            {post.imageUris.map((uri: string, i: number) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.detailImage, { marginTop: i === 0 ? 16 : 8 }]}
                contentFit="contain"
                transition={200}
              />
            ))}
            <View style={styles.detailMeta}>
              {post.commentCount > 0 && (
                <Text style={[styles.detailMetaText, { color: colors.navInactive }]}>
                  {post.commentCount} comentario{post.commentCount !== 1 ? 's' : ''}
                </Text>
              )}
              {post.reactions
                .filter((r: { emoji: string; count: number }) => r.count > 0)
                .map((r: { emoji: string; count: number }) => (
                  <Text key={r.emoji} style={[styles.detailMetaText, { color: colors.navInactive }]}>
                    {r.emoji} {r.count}
                  </Text>
                ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── ProfileScreen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const colors = useColors();
  const { user, updateProfile, logout } = useAuth();
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

  const {
    posts: myPosts,
    isLoading: postsLoading,
    isFetchingNextPage: postsLoadingMore,
    hasMore: postsHasMore,
    fetchNextPage: fetchMorePosts,
  } = useMyPosts(user?.id ?? '');

  if (!user) return null;

  const bookedSessions = getUpcomingBooked(10);

  const navItems: DrawerNavItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  }));

  const handleNavigate = (route: string) => {
    setDrawerVisible(false);
    if (route !== pathname) router.push(route as never);
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
          <Avatar uri={user.avatarUri} onChange={(uri) => updateProfile({ avatarUri: uri })} />
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
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: user.status === 'active' ? colors.success : colors.inactive },
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {user.status === 'active' ? 'Cuenta Activa' : 'Cuenta Inactiva'}
            </Text>
          </View>
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
        <FlatList
          data={myPosts}
          keyExtractor={(p) => p.id}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          onEndReached={postsHasMore ? () => fetchMorePosts() : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            postsLoadingMore ? (
              <ActivityIndicator color={colors.navActive} style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            postsLoading ? (
              <ActivityIndicator color={colors.navActive} style={{ margin: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                <Feather name="image" size={26} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Sin publicaciones aún
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Comparte algo en la Comunidad para verlo aquí.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <PostThumb
              post={item}
              colors={colors}
              onPress={() => {
                setSelectedPost(item);
                setPostDetailVisible(true);
              }}
            />
          )}
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
        colors={colors}
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

  // Posts grid tab
  gridContent: { paddingBottom: 110 },
  // Each row is exactly 3 items with 2 gaps of GRID_GAP between them
  gridRow: { gap: GRID_GAP },
  postThumb: {
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    marginBottom: GRID_GAP,
  },
  postThumbTextWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  postThumbBody: { fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 14 },
  multiImgBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  multiImgText: { fontSize: 10, color: '#fff', fontFamily: 'Inter_700Bold' },

  // Post detail modal
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '90%',
  },
  detailClose: { alignSelf: 'flex-end', marginBottom: 10 },
  detailAuthor: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  detailTime: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  detailBody: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 14 },
  detailImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  detailMetaText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
