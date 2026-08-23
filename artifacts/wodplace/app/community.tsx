import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { getAdminCode } from '@/lib/adminSession';
import { SUBSCRIBED_BOX } from '@/constants/boxInfo';
import {
  useBoxName,
  useSocialFeed,
  useSocialMutations,
  useComments,
  type SocialPost,
  type SocialComment,
} from '@workspace/api-client-react';

const LOGO = require('../assets/images/wodplace-logo.png');
const SCREEN_WIDTH = Dimensions.get('window').width;

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam o publicidad' },
  { key: 'inappropriate', label: 'Contenido inapropiado' },
  { key: 'other', label: 'Otro motivo' },
];

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
];

type SelectedImage = { uri: string; mimeType?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'Ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} d`;
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

// ─── PostAvatar ───────────────────────────────────────────────────────────────

function PostAvatar({ name, isBox, size = 40 }: { name: string; isBox?: boolean; size?: number }) {
  const colors = useColors();
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };
  if (isBox) {
    return (
      <View style={[circleStyle, styles.avatarFallback, { backgroundColor: colors.navActive }]}>
        <Feather name="home" size={size * 0.44} color="#fff" />
      </View>
    );
  }
  return (
    <View style={[circleStyle, styles.avatarFallback, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.initials, { color: colors.secondaryForeground, fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── ImageCarousel ────────────────────────────────────────────────────────────

function ImageCarousel({ uris, colors }: { uris: string[]; colors: ReturnType<typeof useColors> }) {
  const [index, setIndex] = useState(0);
  // Card has 16px padding each side inside a 18px horizontal padding container
  const cardWidth = SCREEN_WIDTH - 36 - 32; // screen - content padding - card padding

  if (uris.length === 0) return null;

  if (uris.length === 1) {
    return (
      <Image
        source={{ uri: uris[0] }}
        style={styles.singleImage}
        contentFit="cover"
        transition={300}
      />
    );
  }

  return (
    <View>
      <FlatList
        data={uris}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        onMomentumScrollEnd={(e) => {
          const newIdx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
          setIndex(newIdx);
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: cardWidth, aspectRatio: 4 / 3, borderRadius: 14 }}
            contentFit="cover"
            transition={300}
          />
        )}
      />
      {/* Dots */}
      <View style={styles.dotsRow}>
        {uris.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? colors.navActive : colors.navBorder,
                width: i === index ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── PostMenuSheet ────────────────────────────────────────────────────────────

type MenuAction = { label: string; icon: string; destructive?: boolean; onPress: () => void };

function PostMenuSheet({
  visible,
  onClose,
  actions,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.navBorder }]} />
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={() => { onClose(); a.onPress(); }}
              style={({ pressed }) => [styles.sheetItem, pressed && { opacity: 0.6 }]}
            >
              <Feather name={a.icon as never} size={18} color={a.destructive ? colors.destructive : colors.foreground} />
              <Text style={[styles.sheetItemText, { color: a.destructive ? colors.destructive : colors.foreground }]}>
                {a.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.sheetCancel, { borderTopColor: colors.navBorder }, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.navInactive }]}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── CommentsModal ────────────────────────────────────────────────────────────

function CommentsModal({
  post,
  userId,
  authorName,
  isAdmin,
  adminCode,
  visible,
  onClose,
  onDelta,
  colors,
}: {
  post: SocialPost | null;
  userId: string;
  authorName: string;
  isAdmin: boolean;
  adminCode: string | null;
  visible: boolean;
  onClose: () => void;
  onDelta: (postId: string, delta: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { comments, isLoading, hasMore, fetchNextPage, refresh } = useComments(visible ? (post?.id ?? null) : null);
  const { addComment, deleteComment } = useSocialMutations(userId, authorName);

  useEffect(() => { if (visible) { setDraft(''); refresh(); } }, [visible, post?.id]);

  const handleSubmit = async () => {
    if (!draft.trim() || !post) return;
    setSubmitting(true);
    try {
      await addComment(post.id, draft.trim());
      onDelta(post.id, 1);
      setDraft('');
      refresh();
    } catch {
      Alert.alert('Error', 'No se pudo publicar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (c: SocialComment) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(post!.id, c.id, isAdmin ? (adminCode ?? undefined) : undefined);
            onDelta(post!.id, -1);
            refresh();
          } catch (err: unknown) {
            const apiErr = err as { data?: { error?: string }; message?: string } | null;
            const msg = apiErr?.data?.error ?? apiErr?.message ?? 'No se pudo eliminar.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      {/* KeyboardAvoidingView as the backdrop-level container so the sheet
          rises above the keyboard (same library as EditPhraseModal). */}
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.commentsBackdrop, { backgroundColor: colors.foreground + '55' }]}
      >
        <View style={[styles.commentsSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.navBorder, alignSelf: 'center', marginTop: 12, marginBottom: 4 }]} />
          <View style={[styles.commentsHeader, { borderBottomColor: colors.navBorder }]}>
            <Text style={[styles.commentsTitle, { color: colors.foreground }]}>Comentarios</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ margin: 32 }} color={colors.navActive} />
          ) : comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={[styles.emptyCommentsText, { color: colors.navInactive }]}>Sé el primero en comentar.</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
              onEndReached={hasMore ? fetchNextPage : undefined}
              onEndReachedThreshold={0.4}
              renderItem={({ item }) => (
                <View style={[styles.commentRow, { borderBottomColor: colors.navBorder }]}>
                  <PostAvatar name={item.authorName} size={32} />
                  <View style={styles.commentBody}>
                    <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
                    <Text style={[styles.commentText, { color: colors.mutedForeground }]}>{item.body}</Text>
                    <Text style={[styles.commentTime, { color: colors.navInactive }]}>{relativeTime(item.createdAt)}</Text>
                  </View>
                  {(item.userId === userId || isAdmin) ? (
                    <Pressable onPress={() => handleDeleteComment(item)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={colors.navInactive} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          )}

          {/* ─── Comment input (pill style, centered, not reaching edges) ─── */}
          <View style={[styles.commentInputRow, { borderTopColor: colors.navBorder, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.commentDraft, { color: colors.foreground, backgroundColor: colors.card }]}
              placeholder="Escribe un comentario..."
              placeholderTextColor={colors.navInactive}
              value={draft}
              onChangeText={setDraft}
              maxLength={500}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              onPress={handleSubmit}
              disabled={!draft.trim() || submitting}
              style={({ pressed }) => [
                styles.commentSend,
                { backgroundColor: draft.trim() ? colors.navActive : colors.navBorder },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="arrow-up" size={15} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ReportModal ──────────────────────────────────────────────────────────────

function ReportModal({
  postId,
  userId,
  authorName,
  visible,
  onClose,
  colors,
}: {
  postId: string | null;
  userId: string;
  authorName: string;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { reportPost } = useSocialMutations(userId, authorName);

  const handleSubmit = async () => {
    if (!selected || !postId) return;
    setSubmitting(true);
    try {
      await reportPost(postId, selected);
      onClose();
      setSelected(null);
      Alert.alert('Reportado', 'Tu reporte fue enviado al equipo de moderación. Gracias.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.navBorder }]} />
          <Text style={[styles.reportTitle, { color: colors.foreground }]}>¿Por qué reportas esto?</Text>
          {REPORT_REASONS.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setSelected(r.key)}
              style={({ pressed }) => [
                styles.reportOption,
                { borderColor: selected === r.key ? colors.navActive : colors.navBorder },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[
                styles.reportDot,
                { borderColor: selected === r.key ? colors.navActive : colors.navInactive },
                selected === r.key && { backgroundColor: colors.navActive },
              ]} />
              <Text style={[styles.reportLabel, { color: colors.foreground }]}>{r.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={handleSubmit}
            disabled={!selected || submitting}
            style={({ pressed }) => [
              styles.reportSubmit,
              { backgroundColor: selected ? colors.navActive : colors.navBorder },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.reportSubmitText, { color: selected ? '#fff' : colors.navInactive }]}>
              {submitting ? 'Enviando...' : 'Reportar'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.sheetCancel, { borderTopColor: colors.navBorder }, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.navInactive }]}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  userId,
  isAdmin,
  adminCode,
  colors,
  onReact,
  onDelete,
  onEdit,
  onComment,
  onReport,
  onBlock,
}: {
  post: SocialPost;
  userId: string;
  authorName: string;
  isAdmin: boolean;
  adminCode: string | null;
  colors: ReturnType<typeof useColors>;
  onReact: (postId: string, emoji: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (post: SocialPost) => void;
  onComment: (post: SocialPost) => void;
  onReport: (postId: string) => void;
  onBlock: (post: SocialPost) => void;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const isAuthor = post.userId === userId;
  const isBox = post.type === 'announcement';

  const heartItem = post.reactions.find((r) => r.emoji === '❤️');
  const isLiked = post.myReaction === '❤️';

  const menuActions: MenuAction[] = isAdmin
    ? [
        { label: 'Eliminar publicación', icon: 'trash-2', destructive: true, onPress: () => onDelete(post.id) },
        ...(post.userId ? [{ label: 'Bloquear autor', icon: 'slash', destructive: true, onPress: () => onBlock(post) }] : []),
      ]
    : isAuthor
    ? [
        ...(post.canEdit ? [{ label: 'Editar', icon: 'edit-2', onPress: () => onEdit(post) }] : []),
        { label: 'Eliminar', icon: 'trash-2', destructive: true, onPress: () => onDelete(post.id) },
      ]
    : [{ label: 'Reportar publicación', icon: 'flag', onPress: () => onReport(post.id) }];

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <PostAvatar name={post.authorName} isBox={isBox} />
        <View style={styles.postAuthorBlock}>
          <View style={styles.postAuthorRow}>
            <Text style={[styles.postAuthor, { color: colors.foreground }]} numberOfLines={1}>
              {post.authorName}
            </Text>
            {isBox && (
              <View style={[styles.boxTag, { backgroundColor: colors.warningBackground }]}>
                <Text style={[styles.boxTagText, { color: colors.warning }]}>BOX</Text>
              </View>
            )}
          </View>
          <Text style={[styles.postTime, { color: colors.navInactive }]}>{relativeTime(post.createdAt)}</Text>
        </View>
        <Pressable
          onPress={() => setMenuVisible(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.menuDotBtn, pressed && { opacity: 0.5 }]}
        >
          <Feather name="more-vertical" size={18} color={colors.navInactive} />
        </Pressable>
      </View>

      {/* Body */}
      {post.body ? <Text style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text> : null}

      {/* Images carousel */}
      {post.imageUris.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <ImageCarousel uris={post.imageUris} colors={colors} />
        </View>
      )}

      {/* ❤️ + 💬 row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onReact(post.id, '❤️')}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.65 }]}
        >
          <Feather
            name="heart"
            size={21}
            color={isLiked ? '#E0245E' : colors.navInactive}
          />
          {heartItem && heartItem.count > 0 ? (
            <Text style={[styles.actionCount, { color: isLiked ? '#E0245E' : colors.navInactive }]}>
              {heartItem.count}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => onComment(post)}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.65 }]}
        >
          <Feather name="message-circle" size={21} color={colors.navInactive} />
          {post.commentCount > 0 ? (
            <Text style={[styles.actionCount, { color: colors.navInactive }]}>
              {post.commentCount}
            </Text>
          ) : null}
        </Pressable>
      </View>

      <PostMenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} actions={menuActions} colors={colors} />
    </View>
  );
}

// ─── CommunityScreen ──────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const adminCode = getAdminCode();
  const isAdmin = !!adminCode;

  const { name: rawBoxName } = useBoxName();
  const boxName = rawBoxName || SUBSCRIBED_BOX.name;

  const {
    posts, isLoading, isFetchingNextPage, hasMore,
    fetchNextPage, updatePost, removePost, prependPost,
  } = useSocialFeed(user?.id);

  const { createPost, editPost, deletePost, toggleReaction, uploadSocialImage, blockUser } =
    useSocialMutations(user?.id ?? '', user?.name ?? '');

  // Composer
  const [composerVisible, setComposerVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Comments
  const [commentsPost, setCommentsPost] = useState<SocialPost | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // Report
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  // Drawer
  const [drawerVisible, setDrawerVisible] = useState(false);

  if (!user) return null;

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

  const chooseImage = async () => {
    if (selectedImages.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya alcanzaste el límite de fotos por publicación.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para adjuntar imágenes.');
      return;
    }
    const remaining = 4 - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImgs: SelectedImage[] = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? undefined,
      }));
      setSelectedImages((prev) => [...prev, ...newImgs].slice(0, 4));
    }
  };

  const closeComposer = () => {
    setComposerVisible(false);
    setDraft('');
    setSelectedImages([]);
    setEditingPost(null);
  };

  const handlePublish = async () => {
    if (!draft.trim() && selectedImages.length === 0) return;
    setPublishing(true);
    try {
      if (editingPost) {
        const updated = await editPost(editingPost.id, draft.trim());
        updatePost(editingPost.id, { body: updated.body });
        closeComposer();
        return;
      }
      // Upload images
      const uploadedUris: string[] = [];
      for (const img of selectedImages) {
        try {
          const mime = img.mimeType || (img.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
          // On native: pass a binary-PUT uploader via expo-file-system/legacy.
          // On web: leave it undefined so uploadSocialImage uses fetch→blob→XHR.
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
          const url = await uploadSocialImage(img.uri, mime, nativeUploader);
          uploadedUris.push(url);
        } catch (err) {
          console.warn('Image upload failed:', err);
          Alert.alert('Error al subir imagen', 'No se pudo subir una foto. El resto se publicará igual.');
        }
      }
      const created = await createPost(
        draft.trim() || (uploadedUris.length > 0 ? 'Compartió una foto con la comunidad.' : ''),
        uploadedUris,
      );
      prependPost(created);
      closeComposer();
    } catch {
      Alert.alert('Error', 'No se pudo publicar. Intenta de nuevo.');
    } finally {
      setPublishing(false);
    }
  };

  const handleReact = async (postId: string, emoji: string) => {
    try {
      const result = await toggleReaction(postId, emoji);
      updatePost(postId, { reactions: result.reactions, myReaction: result.myReaction });
    } catch { /* silent */ }
  };

  const handleDelete = (postId: string) => {
    Alert.alert('Eliminar publicación', '¿Estás seguro? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId, isAdmin ? (adminCode ?? undefined) : undefined);
            removePost(postId);
          } catch (err: unknown) {
            const apiErr = err as { data?: { error?: string }; message?: string } | null;
            const msg = apiErr?.data?.error ?? apiErr?.message ?? 'No se pudo eliminar.';
            Alert.alert('Error al eliminar', msg);
          }
        },
      },
    ]);
  };

  const handleEdit = (post: SocialPost) => {
    setEditingPost(post);
    setDraft(post.body);
    setSelectedImages([]);
    setComposerVisible(true);
  };

  const handleBlock = (post: SocialPost) => {
    if (!post.userId || !adminCode) return;
    Alert.alert('Bloquear autor', `¿Bloquear a ${post.authorName}? Sus publicaciones dejarán de aparecer en el feed.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear', style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(post.userId!, adminCode);
            posts.filter((p: SocialPost) => p.userId === post.userId).forEach((p: SocialPost) => removePost(p.id));
            Alert.alert('Bloqueado', `${post.authorName} ha sido bloqueado.`);
          } catch { Alert.alert('Error', 'No se pudo bloquear.'); }
        },
      },
    ]);
  };

  const handleDelta = useCallback((postId: string, delta: number) => {
    const post = posts.find((p: SocialPost) => p.id === postId);
    if (post) updatePost(postId, { commentCount: Math.max(0, post.commentCount + delta) });
  }, [posts, updatePost]);

  const titleLine = boxName.length > 16 ? `${boxName}\nSocial` : `${boxName} Social`;

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <View>
            <Text style={[styles.headerKicker, { color: colors.navInactive }]}>COMUNIDAD</Text>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={3}>
              {titleLine.toUpperCase()}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setComposerVisible(true)}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.navFloating }, pressed && styles.addButtonPressed]}
        >
          <Feather name="plus" size={23} color={colors.navFloatingForeground} />
        </Pressable>
      </View>
      <View style={[styles.feedIntro, { borderBottomColor: colors.navBorder }]}>
        <Text style={[styles.feedIntroTitle, { color: colors.foreground }]}>Lo último del box</Text>
        <Text style={[styles.feedIntroText, { color: colors.navInactive }]}>
          Comparte, celebra y acompaña a tu comunidad.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />

      {isLoading && posts.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.navActive} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.content, { paddingBottom: 122 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          onEndReached={hasMore ? () => fetchNextPage() : undefined}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.navActive} style={{ marginVertical: 16 }} />
            ) : !hasMore && posts.length > 0 ? (
              <Text style={[styles.endText, { color: colors.navInactive }]}>
                Publicaciones de los últimos 60 días.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={32} color={colors.navInactive} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin publicaciones aún</Text>
              <Text style={[styles.emptyText, { color: colors.navInactive }]}>
                Sé el primero en compartir algo con la comunidad.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              userId={user.id}
              authorName={user.name}
              isAdmin={isAdmin}
              adminCode={adminCode}
              colors={colors}
              onReact={handleReact}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onComment={(p) => { setCommentsPost(p); setCommentsVisible(true); }}
              onReport={(id) => { setReportPostId(id); setReportVisible(true); }}
              onBlock={handleBlock}
            />
          )}
        />
      )}

      {/* ── Composer Modal ── */}
      <Modal animationType="slide" transparent visible={composerVisible} onRequestClose={closeComposer}>
        <KeyboardAvoidingView
          behavior="padding"
          style={[styles.composerBackdrop, { backgroundColor: colors.foreground + '66' }]}
        >
          <View style={[styles.composerSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.handle, { backgroundColor: colors.navBorder, alignSelf: 'center', marginBottom: 18 }]} />
            <View style={styles.sheetTopRow}>
              <View>
                <Text style={[styles.sheetKicker, { color: colors.navInactive }]}>
                  {editingPost ? 'EDITAR' : 'WOD SOCIAL'}
                </Text>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  {editingPost ? 'Editar publicación' : 'Nueva publicación'}
                </Text>
              </View>
              <Pressable onPress={closeComposer} hitSlop={8}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.draftInput, { color: colors.foreground, borderColor: colors.navBorder }]}
              placeholder="¿Qué quieres compartir hoy?"
              placeholderTextColor={colors.navInactive}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={1000}
              autoFocus
            />

            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.composerImageRow}>
                {selectedImages.map((img, i) => (
                  <View key={i} style={styles.composerThumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.composerThumb} contentFit="cover" />
                    <Pressable
                      onPress={() => setSelectedImages((prev) => prev.filter((_, j) => j !== i))}
                      style={[styles.composerRemove, { backgroundColor: colors.destructive }]}
                    >
                      <Feather name="x" size={11} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.composerActions}>
              {!editingPost && (
                <Pressable
                  onPress={chooseImage}
                  disabled={selectedImages.length >= 4}
                  style={({ pressed }) => [
                    styles.attachButton,
                    { borderColor: colors.navBorder, opacity: selectedImages.length >= 4 ? 0.35 : 1 },
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <Feather name="image" size={17} color={colors.navActive} />
                  <Text style={[styles.attachText, { color: colors.foreground }]}>
                    Foto{selectedImages.length > 0 ? ` (${selectedImages.length}/4)` : ''}
                  </Text>
                </Pressable>
              )}
              <Text style={[styles.charCount, { color: colors.navInactive }]}>{draft.length}/1000</Text>
            </View>

            <Pressable
              disabled={(!draft.trim() && selectedImages.length === 0) || publishing}
              onPress={handlePublish}
              style={({ pressed }) => [
                styles.publishBtn,
                { backgroundColor: (draft.trim() || selectedImages.length > 0) && !publishing ? colors.navActive : colors.navBorder },
                pressed && styles.publishPressed,
              ]}
            >
              <Text style={[styles.publishText, { color: (draft.trim() || selectedImages.length > 0) && !publishing ? colors.card : colors.navInactive }]}>
                {publishing ? 'Publicando...' : editingPost ? 'Guardar' : 'Publicar'}
              </Text>
              <Feather name="arrow-up-right" size={17} color={(draft.trim() || selectedImages.length > 0) && !publishing ? colors.card : colors.navInactive} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Comments ── */}
      <CommentsModal
        post={commentsPost}
        userId={user.id}
        authorName={user.name}
        isAdmin={isAdmin}
        adminCode={adminCode}
        visible={commentsVisible}
        onClose={() => { setCommentsVisible(false); setCommentsPost(null); }}
        onDelta={handleDelta}
        colors={colors}
      />

      {/* ── Report ── */}
      <ReportModal
        postId={reportPostId}
        userId={user.id}
        authorName={user.name}
        visible={reportVisible}
        onClose={() => { setReportVisible(false); setReportPostId(null); }}
        colors={colors}
      />

      {/* ── Drawer ── */}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 46, height: 46 },
  headerKicker: { fontSize: 9, letterSpacing: 1.5, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 24, lineHeight: 28, letterSpacing: 0.4, fontFamily: 'Anton_400Regular', maxWidth: 210 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 },
  feedIntro: { paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 14 },
  feedIntroTitle: { fontSize: 18, fontFamily: 'Anton_400Regular' },
  feedIntroText: { fontSize: 12, lineHeight: 18, marginTop: 2, fontFamily: 'Inter_500Medium' },
  // Post card
  postCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postAuthorBlock: { flex: 1, marginLeft: 10 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postAuthor: { fontSize: 13, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  postTime: { fontSize: 11, marginTop: 2, fontFamily: 'Inter_500Medium' },
  menuDotBtn: { padding: 4 },
  boxTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  boxTagText: { fontSize: 9, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  postBody: { fontSize: 14, lineHeight: 21, marginTop: 13, fontFamily: 'Inter_500Medium' },
  // Avatar
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Inter_700Bold' },
  // Images
  singleImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },
  // Carousel dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
  dot: { height: 6, borderRadius: 3 },
  // Actions row (❤️ + 💬)
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  // Sheets / Modals
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  handle: { width: 38, height: 4, borderRadius: 2 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  sheetItemText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  sheetCancel: { paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', marginTop: 4 },
  sheetCancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  // Comments modal
  commentsBackdrop: { flex: 1, justifyContent: 'flex-end' },
  commentsSheet: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  commentsTitle: { fontSize: 17, fontFamily: 'Anton_400Regular' },
  emptyComments: { padding: 32, alignItems: 'center' },
  emptyCommentsText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  commentText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  commentTime: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 3 },
  // Comment input — pill, not reaching edges
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentDraft: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 80,
  },
  commentSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  // Report modal
  reportTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginVertical: 12 },
  reportOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 12, padding: 13, marginBottom: 9 },
  reportDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  reportLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  reportSubmit: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  reportSubmitText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  // Composer
  composerBackdrop: { flex: 1, justifyContent: 'flex-end' },
  composerSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30, minHeight: 420 },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetKicker: { fontSize: 9, letterSpacing: 1.4, fontFamily: 'Inter_700Bold' },
  sheetTitle: { fontSize: 24, marginTop: 2, fontFamily: 'Anton_400Regular' },
  draftInput: { minHeight: 120, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 15, fontSize: 15, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 18 },
  composerImageRow: { marginTop: 10 },
  composerThumbWrap: { position: 'relative', marginRight: 8 },
  composerThumb: { width: 80, height: 80, borderRadius: 10 },
  composerRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  composerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  attachButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  attachText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  charCount: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  publishBtn: { height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  publishText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  publishPressed: { opacity: 0.85 },
  // Feed states
  endText: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_500Medium', paddingVertical: 20 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', paddingHorizontal: 24 },
});
