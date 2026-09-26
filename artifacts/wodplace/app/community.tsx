import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getAdminToken } from '@/lib/adminSession';
import { getAdminNavItem, shouldShowContracts } from '@/lib/navigation';
import {
  getBoxAnnouncements,
  markAnnouncementRead,
  useAnnouncementComments,
  useAnnouncementMutations,
  useSocialFeed,
  useSocialMutations,
  useComments,
  type AnnouncementComment,
  type BoxAnnouncement,
  type SocialPost,
  type SocialComment,
} from '@workspace/api-client-react';
import { AutoFitImage } from '@/components/AutoFitImage';

const LOGO = require('../assets/images/wodplace-logo.png');
const SCREEN_WIDTH = Dimensions.get('window').width;
// Card has 16px padding each side inside an 18px horizontal page padding.
const POST_IMAGE_WIDTH = SCREEN_WIDTH - 36 - 32;

/** A real post and an "Aviso del box" render as the same kind of card,
 *  mixed chronologically into one feed — this is what lets the FlatList
 *  dispatch each row to the right one. */
type FeedItem =
  | { kind: 'post'; key: string; createdAt: string; post: SocialPost }
  | { kind: 'announcement'; key: string; createdAt: string; announcement: BoxAnnouncement };

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

type SelectedImage = { uri: string; mimeType?: string; fileSize?: number };

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

/** Opens the tapped member's public profile — never for box-authored posts
 *  (those have no userId behind them). */
function goToMemberProfile(userId: string, name: string) {
  router.push({ pathname: '/member/[id]', params: { id: userId, name } });
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
  const cardWidth = POST_IMAGE_WIDTH;

  if (uris.length === 0) return null;

  if (uris.length === 1) {
    return <AutoFitImage uri={uris[0]} width={cardWidth} borderRadius={14} />;
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
        renderItem={({ item }) => <AutoFitImage uri={item} width={cardWidth} borderRadius={14} />}
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
  isActive,
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
  isActive: boolean;
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
    if (!isActive) {
      Alert.alert(
        'Cuenta no activa',
        'Activa tu cuenta completando el registro en Contratos Activos para poder comentar.',
      );
      return;
    }
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
                  <Pressable
                    style={styles.postAuthorTouchable}
                    disabled={!item.userId}
                    onPress={() => item.userId && goToMemberProfile(item.userId, item.authorName)}
                  >
                    <PostAvatar name={item.authorName} size={32} />
                    <View style={styles.commentBody}>
                      <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
                      <Text style={[styles.commentText, { color: colors.mutedForeground }]}>{item.body}</Text>
                      <Text style={[styles.commentTime, { color: colors.navInactive }]}>{relativeTime(item.createdAt)}</Text>
                    </View>
                  </Pressable>
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

// ─── AnnouncementCommentsModal ─────────────────────────────────────────────────
// Same shape as CommentsModal, pointed at announcement_comments instead of
// social_comments — kept as its own component rather than parameterizing
// CommentsModal, so the two systems stay easy to reason about separately.

function AnnouncementCommentsModal({
  announcement,
  userId,
  authorName,
  isAdmin,
  isActive,
  adminCode,
  visible,
  onClose,
  onDelta,
  colors,
}: {
  announcement: BoxAnnouncement | null;
  userId: string;
  authorName: string;
  isAdmin: boolean;
  isActive: boolean;
  adminCode: string | null;
  visible: boolean;
  onClose: () => void;
  onDelta: (announcementId: string, delta: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { comments, isLoading, hasMore, fetchNextPage, refresh } = useAnnouncementComments(
    visible ? (announcement?.id ?? null) : null,
  );
  const { addComment, deleteComment } = useAnnouncementMutations(userId, authorName);

  useEffect(() => { if (visible) { setDraft(''); refresh(); } }, [visible, announcement?.id]);

  const handleSubmit = async () => {
    if (!draft.trim() || !announcement) return;
    if (!isActive) {
      Alert.alert(
        'Cuenta no activa',
        'Activa tu cuenta completando el registro en Contratos Activos para poder comentar.',
      );
      return;
    }
    setSubmitting(true);
    try {
      await addComment(announcement.id, draft.trim());
      onDelta(announcement.id, 1);
      setDraft('');
      refresh();
    } catch {
      Alert.alert('Error', 'No se pudo publicar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (c: AnnouncementComment) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(announcement!.id, c.id, isAdmin ? (adminCode ?? undefined) : undefined);
            onDelta(announcement!.id, -1);
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
                  <Pressable
                    style={styles.postAuthorTouchable}
                    disabled={!item.userId}
                    onPress={() => item.userId && goToMemberProfile(item.userId, item.authorName)}
                  >
                    <PostAvatar name={item.authorName} size={32} />
                    <View style={styles.commentBody}>
                      <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
                      <Text style={[styles.commentText, { color: colors.mutedForeground }]}>{item.body}</Text>
                      <Text style={[styles.commentTime, { color: colors.navInactive }]}>{relativeTime(item.createdAt)}</Text>
                    </View>
                  </Pressable>
                  {(item.userId === userId || isAdmin) ? (
                    <Pressable onPress={() => handleDeleteComment(item)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={colors.navInactive} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          )}

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
  const [evidence, setEvidence] = useState<SelectedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { reportPost, uploadReportImage } = useSocialMutations(userId, authorName);

  const pickEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para adjuntar una captura.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const a = result.assets[0];
      setEvidence({ uri: a.uri, mimeType: a.mimeType ?? undefined, fileSize: a.fileSize ?? undefined });
    }
  };

  const handleSubmit = async () => {
    if (!selected || !postId) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (evidence) {
        try {
          const mime = evidence.mimeType || (evidence.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
          const nativeUploader = Platform.OS !== 'web'
            ? async (uploadURL: string, fileUri: string, contentType: string) => {
                const result = await FileSystem.uploadAsync(uploadURL, fileUri, {
                  httpMethod: 'PUT',
                  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                  headers: { 'Content-Type': contentType },
                });
                if (result.status < 200 || result.status >= 300) {
                  throw new Error(`La captura no se pudo subir (HTTP ${result.status}).`);
                }
              }
            : undefined;
          imageUrl = await uploadReportImage(evidence.uri, mime, nativeUploader, evidence.fileSize);
        } catch (err) {
          console.warn('Report evidence upload failed:', err);
          Alert.alert('Error al subir la captura', 'Se enviará el reporte sin la imagen.');
        }
      }
      await reportPost(postId, selected, imageUrl);
      onClose();
      setSelected(null);
      setEvidence(null);
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

          {evidence ? (
            <View style={styles.reportEvidenceRow}>
              <Image source={{ uri: evidence.uri }} style={styles.reportEvidenceThumb} contentFit="cover" />
              <Pressable onPress={() => setEvidence(null)} hitSlop={8} style={styles.reportEvidenceRemove}>
                <Feather name="x-circle" size={20} color={colors.navInactive} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickEvidence}
              style={({ pressed }) => [styles.reportAttachBtn, { borderColor: colors.navBorder }, pressed && { opacity: 0.7 }]}
            >
              <Feather name="camera" size={15} color={colors.navInactive} />
              <Text style={[styles.reportAttachText, { color: colors.navInactive }]}>
                Adjuntar captura (opcional)
              </Text>
            </Pressable>
          )}

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

  const canOpenProfile = !isBox && !!post.userId;

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Pressable
          style={styles.postAuthorTouchable}
          disabled={!canOpenProfile}
          onPress={() => canOpenProfile && goToMemberProfile(post.userId!, post.authorName)}
        >
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
        </Pressable>
        <Pressable
          onPress={() => setMenuVisible(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.menuDotBtn, pressed && { opacity: 0.5 }]}
        >
          <Feather name="more-vertical" size={18} color={colors.navInactive} />
        </Pressable>
      </View>

      {/* Foto — arriba, completa y sin recortar (estilo Instagram) */}
      {post.imageUris.length > 0 && (
        <View style={styles.postImageWrap}>
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

      {/* Texto — recién debajo de la foto y las acciones */}
      {post.body ? <Text style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text> : null}

      <PostMenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} actions={menuActions} colors={colors} />
    </View>
  );
}

// ─── AnnouncementFeedCard ───────────────────────────────────────────────────────
// An "Aviso del box" rendered as a feed card — same structure as a real post
// (header, photo on top uncropped, then text), but with no like/comment row
// (avisos don't have reactions) and marked as read simply by appearing here.

function AnnouncementFeedCard({
  announcement,
  colors,
  onSeen,
  onReact,
  onComment,
}: {
  announcement: BoxAnnouncement;
  colors: ReturnType<typeof useColors>;
  onSeen: (a: BoxAnnouncement) => void;
  onReact: (announcementId: string, emoji: string) => void;
  onComment: (a: BoxAnnouncement) => void;
}) {
  useEffect(() => {
    onSeen(announcement);
    // Only ever needs to fire once per mount of this specific announcement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement.id]);

  const heartItem = announcement.reactions.find((r) => r.emoji === '❤️');
  const isLiked = announcement.myReaction === '❤️';

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthorTouchable}>
          <PostAvatar name="Box" isBox />
          <View style={styles.postAuthorBlock}>
            <View style={styles.postAuthorRow}>
              <Text style={[styles.postAuthor, { color: colors.foreground }]} numberOfLines={1}>
                Aviso del box
              </Text>
              <View style={[styles.boxTag, { backgroundColor: colors.warningBackground }]}>
                <Text style={[styles.boxTagText, { color: colors.warning }]}>BOX</Text>
              </View>
            </View>
            <Text style={[styles.postTime, { color: colors.navInactive }]}>
              {relativeTime(announcement.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {announcement.imageUrl ? (
        <View style={styles.postImageWrap}>
          <AutoFitImage uri={announcement.imageUrl} width={POST_IMAGE_WIDTH} borderRadius={14} />
        </View>
      ) : null}

      {/* ❤️ + 💬 row — same as a real post */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onReact(announcement.id, '❤️')}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.65 }]}
        >
          <Feather name="heart" size={21} color={isLiked ? '#E0245E' : colors.navInactive} />
          {heartItem && heartItem.count > 0 ? (
            <Text style={[styles.actionCount, { color: isLiked ? '#E0245E' : colors.navInactive }]}>
              {heartItem.count}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => onComment(announcement)}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.65 }]}
        >
          <Feather name="message-circle" size={21} color={colors.navInactive} />
          {announcement.commentCount > 0 ? (
            <Text style={[styles.actionCount, { color: colors.navInactive }]}>
              {announcement.commentCount}
            </Text>
          ) : null}
        </Pressable>
      </View>

      <Text style={[styles.announcementTitle, { color: colors.foreground }]}>
        {announcement.title}
      </Text>
      {announcement.body ? (
        <Text style={[styles.postBody, { color: colors.foreground }]}>{announcement.body}</Text>
      ) : null}
    </View>
  );
}

// ─── CommunityScreen ──────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, adminStatus, hasBoxMembership, myBox, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const adminCode = getAdminToken(); // admin session token (PIN flow), passed as Bearer
  const isAdmin = !!adminCode;

  // No box yet -> the generic "WODPLACE SOCIAL" header and no feed content
  // at all (see Option A of the Comunidad box-scoping change: the backend
  // now genuinely separates each box's posts/comments/reactions/reports —
  // there's nothing box-less to show here beyond the header itself).
  // `myBox` comes from AuthContext (already fetched there) instead of a
  // separate request here for the same data.
  const myBoxName = hasBoxMembership ? (myBox?.name ?? null) : null;

  // "Avisos del box" (see GET /box-memberships/announcements) — mixed into
  // the feed below as if they were posts (chronologically, by createdAt),
  // not pinned in a separate section. These are the `banner`-type avisos;
  // the `push` type is handled entirely on Home as a must-confirm popup and
  // never shows up here.
  const [bannerAnnouncements, setBannerAnnouncements] = useState<BoxAnnouncement[]>([]);
  useEffect(() => {
    if (!hasBoxMembership || !user?.id) {
      setBannerAnnouncements([]);
      return;
    }
    getBoxAnnouncements(user.id)
      .then((res) => setBannerAnnouncements(res.banner))
      .catch(() => setBannerAnnouncements([]));
  }, [hasBoxMembership, user?.id]);

  // An aviso in the feed counts as "read" simply by scrolling past it —
  // there's no tap-to-open step (that confirmation flow is Home's push
  // popup only). Guarded by a ref so re-mounts from FlatList's
  // virtualization (scrolling an item off-screen and back) never re-fire
  // the network call once it's already marked.
  const markedAnnouncementsRef = useRef<Set<string>>(new Set());
  const markAnnouncementSeen = useCallback(
    (a: BoxAnnouncement) => {
      if (a.readByMe || markedAnnouncementsRef.current.has(a.id) || !user?.id) return;
      markedAnnouncementsRef.current.add(a.id);
      markAnnouncementRead(a.id, user.id).catch(() => {});
      setBannerAnnouncements((current) =>
        current.map((item) => (item.id === a.id ? { ...item, readByMe: true } : item)),
      );
    },
    [user?.id],
  );

  const {
    posts, isLoading, isFetchingNextPage, hasMore,
    fetchNextPage, updatePost, removePost, prependPost,
  } = useSocialFeed(user?.id);

  // Real posts + avisos, merged and sorted together by createdAt — an aviso
  // from a few days ago lands where it chronologically belongs, not pinned
  // above everything else.
  const feedItems = useMemo<FeedItem[]>(() => {
    const postItems: FeedItem[] = posts.map((p) => ({
      kind: 'post',
      key: `post-${p.id}`,
      createdAt: p.createdAt,
      post: p,
    }));
    const announcementItems: FeedItem[] = bannerAnnouncements.map((a) => ({
      kind: 'announcement',
      key: `announcement-${a.id}`,
      createdAt: a.createdAt,
      announcement: a,
    }));
    return [...postItems, ...announcementItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [posts, bannerAnnouncements]);

  const { createPost, editPost, deletePost, toggleReaction, uploadSocialImage, blockUser } =
    useSocialMutations(user?.id ?? '', user?.name ?? '');
  const { toggleReaction: toggleAnnouncementReaction } = useAnnouncementMutations(
    user?.id ?? '',
    user?.name ?? '',
  );

  // Composer
  const [composerVisible, setComposerVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Comments
  const [commentsPost, setCommentsPost] = useState<SocialPost | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsAnnouncement, setCommentsAnnouncement] = useState<BoxAnnouncement | null>(null);
  const [commentsAnnouncementVisible, setCommentsAnnouncementVisible] = useState(false);

  // Report
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  // Drawer
  const [drawerVisible, setDrawerVisible] = useState(false);

  if (!user) return null;

  // Read-only until the account is active (Contratos Activos) — can browse
  // the feed, open posts/comments, just can't post/comment/react.
  const isActive = user.status === 'active';
  const warnInactive = () => {
    Alert.alert(
      'Cuenta no activa',
      'Activa tu cuenta completando el registro en Contratos Activos para poder publicar, comentar o reaccionar.',
    );
  };

  // Contratos Activos and Plan only make sense once the athlete belongs to
  // a box — an admin role has the platform agreement instead (see
  // getAdminNavItem below), not either of these.
  const showContracts = shouldShowContracts(adminStatus, hasBoxMembership);
  const navItems: DrawerNavItem[] = NAV_ITEMS.filter(
    (item) => (item.key !== 'contracts' && item.key !== 'plan') || showContracts,
  ).map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  }));
  const adminNavItem = getAdminNavItem(adminStatus);
  if (adminNavItem) {
    navItems.push(adminNavItem);
  }

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
        fileSize: a.fileSize ?? undefined,
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
          const url = await uploadSocialImage(img.uri, mime, nativeUploader, img.fileSize);
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
    if (!isActive) { warnInactive(); return; }
    try {
      const result = await toggleReaction(postId, emoji);
      updatePost(postId, { reactions: result.reactions, myReaction: result.myReaction });
    } catch { /* silent */ }
  };

  const handleAnnouncementReact = async (announcementId: string, emoji: string) => {
    if (!isActive) { warnInactive(); return; }
    try {
      const result = await toggleAnnouncementReaction(announcementId, emoji);
      setBannerAnnouncements((current) =>
        current.map((a) =>
          a.id === announcementId ? { ...a, reactions: result.reactions, myReaction: result.myReaction } : a,
        ),
      );
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

  const handleAnnouncementDelta = useCallback((announcementId: string, delta: number) => {
    setBannerAnnouncements((current) =>
      current.map((a) =>
        a.id === announcementId ? { ...a, commentCount: Math.max(0, a.commentCount + delta) } : a,
      ),
    );
  }, []);

  const titleLine =
    hasBoxMembership && myBoxName
      ? myBoxName.length > 16
        ? `${myBoxName}\nSocial`
        : `${myBoxName} Social`
      : 'WODPLACE SOCIAL';

  // Fixed above the feed — brand + "Comunidad" + intro text + publish
  // button never scroll; only the FlatList below does (see the return
  // block: this is now a sibling of the FlatList, not its
  // ListHeaderComponent, which was what made it scroll away before).
  const StickyHeader = (
    <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
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
        {hasBoxMembership ? (
          <Pressable
            onPress={() => (isActive ? setComposerVisible(true) : warnInactive())}
            style={({ pressed }) => [styles.addButton, { backgroundColor: colors.navFloating }, pressed && styles.addButtonPressed]}
          >
            <Feather name="plus" size={23} color={colors.navFloatingForeground} />
          </Pressable>
        ) : null}
      </View>
      {hasBoxMembership ? (
        <View style={[styles.feedIntro, { borderBottomColor: colors.navBorder }]}>
          <Text style={[styles.feedIntroTitle, { color: colors.foreground }]}>Lo último del box</Text>
          <Text style={[styles.feedIntroText, { color: colors.navInactive }]}>
            Comparte, celebra y acompaña a tu comunidad.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />
      {StickyHeader}

      {!hasBoxMembership ? (
        <View style={[styles.content, { paddingTop: 4, paddingBottom: 122 + insets.bottom }]}>
          <View style={styles.emptyState}>
            <Feather name="users" size={32} color={colors.navInactive} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Todavía no tenés un box
            </Text>
            <Text style={[styles.emptyText, { color: colors.navInactive }]}>
              Unite a un box desde Inicio para ver y participar en su comunidad.
            </Text>
          </View>
        </View>
      ) : isLoading && posts.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.navActive} />
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.content, { paddingTop: 4, paddingBottom: 122 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
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
          renderItem={({ item }) =>
            item.kind === 'announcement' ? (
              <AnnouncementFeedCard
                announcement={item.announcement}
                colors={colors}
                onSeen={markAnnouncementSeen}
                onReact={handleAnnouncementReact}
                onComment={(a) => { setCommentsAnnouncement(a); setCommentsAnnouncementVisible(true); }}
              />
            ) : (
              <PostCard
                post={item.post}
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
            )
          }
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
        isActive={isActive}
        adminCode={adminCode}
        visible={commentsVisible}
        onClose={() => { setCommentsVisible(false); setCommentsPost(null); }}
        onDelta={handleDelta}
        colors={colors}
      />

      {/* ── Comments (avisos) ── */}
      <AnnouncementCommentsModal
        announcement={commentsAnnouncement}
        userId={user.id}
        authorName={user.name}
        isAdmin={isAdmin}
        isActive={isActive}
        adminCode={adminCode}
        visible={commentsAnnouncementVisible}
        onClose={() => { setCommentsAnnouncementVisible(false); setCommentsAnnouncement(null); }}
        onDelta={handleAnnouncementDelta}
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
  stickyHeader: { paddingHorizontal: 18, paddingTop: 16 },
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
  // Aviso-as-post title (sits where a post's body would, above the body text)
  announcementTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 8 },
  // Post card
  postCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postAuthorTouchable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  postAuthorBlock: { flex: 1, marginLeft: 10 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postAuthor: { fontSize: 13, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  postTime: { fontSize: 11, marginTop: 2, fontFamily: 'Inter_500Medium' },
  menuDotBtn: { padding: 4 },
  boxTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  boxTagText: { fontSize: 9, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  postBody: { fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: 'Inter_500Medium' },
  // Avatar
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Inter_700Bold' },
  // Images
  postImageWrap: { marginTop: 12 },
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
  reportAttachBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 9,
  },
  reportAttachText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  reportEvidenceRow: { marginBottom: 9 },
  reportEvidenceThumb: { width: '100%', height: 140, borderRadius: 12 },
  reportEvidenceRemove: { position: 'absolute', top: 6, right: 6 },
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
