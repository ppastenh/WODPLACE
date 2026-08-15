import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const LOGO = require('../assets/images/wodplace-logo.png');
const FEED_STORAGE_KEY = 'wodplace_social_feed';

type FeedPost = {
  id: string;
  type: 'post' | 'announcement';
  author: string;
  avatarUri?: string | null;
  body: string;
  imageUri?: string;
  createdAt: string;
  likes: number;
  comments: number;
  likedByMe?: boolean;
};

type FeedEvent = {
  id: string;
  type: 'event';
  title: string;
  dateLabel: string;
  createdAt: string;
  likes: number;
  comments: number;
};

type FeedItem = FeedPost | FeedEvent;

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const INITIAL_FEED: FeedItem[] = [
  {
    id: 'post-box-1',
    type: 'announcement',
    author: 'DLoveBox',
    body: '¡Equipo, nos vemos mañana! Recuerden traer agua, toalla y muchas ganas para el WOD de las 19:00.',
    createdAt: ago(18),
    likes: 24,
    comments: 4,
  },
  {
    id: 'event-1',
    type: 'event',
    title: 'Copa Providencia 2026',
    dateLabel: 'Sábado 24 de agosto · 09:00',
    createdAt: ago(52),
    likes: 31,
    comments: 7,
  },
  {
    id: 'post-athlete-1',
    type: 'post',
    author: 'Camila Rojas',
    body: 'Primer pull-up estricto. Costó meses, pero salió. Gracias por los consejos y la energía de todos.',
    createdAt: ago(126),
    likes: 42,
    comments: 8,
  },
  {
    id: 'post-athlete-2',
    type: 'post',
    author: 'Felipe Muñoz',
    body: 'WOD terminado junto al team de las 7:00. La mejor forma de empezar el día.',
    createdAt: ago(24 * 60 + 10),
    likes: 18,
    comments: 2,
  },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeTime(iso: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

function FeedAvatar({
  item,
  colors,
  size = 42,
}: {
  item: FeedPost;
  colors: ReturnType<typeof useColors>;
  size?: number;
}) {
  const isBox = item.type === 'announcement';
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isBox ? colors.navFloating : colors.input,
        },
      ]}
    >
      {item.avatarUri ? (
        <Image source={{ uri: item.avatarUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : isBox ? (
        <MaterialCommunityIcons name="home-city-outline" size={size * 0.52} color={colors.navFloatingForeground} />
      ) : (
        <Text style={[styles.avatarInitials, { color: colors.navActive }]}>{getInitials(item.author)}</Text>
      )}
    </View>
  );
}

function FeedActions({
  item,
  colors,
  onLike,
}: {
  item: FeedItem;
  colors: ReturnType<typeof useColors>;
  onLike: (id: string) => void;
}) {
  const liked = item.type !== 'event' && item.likedByMe;
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Quitar me gusta' : 'Dar me gusta'}
        onPress={() => onLike(item.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Feather name="heart" size={17} color={liked ? colors.destructive : colors.navInactive} />
        <Text style={[styles.actionText, { color: colors.navInactive }]}>{item.likes}</Text>
      </Pressable>
      <View style={styles.action}>
        <Feather name="message-circle" size={17} color={colors.navInactive} />
        <Text style={[styles.actionText, { color: colors.navInactive }]}>{item.comments}</Text>
      </View>
    </View>
  );
}

function PostCard({
  item,
  colors,
  onLike,
}: {
  item: FeedPost;
  colors: ReturnType<typeof useColors>;
  onLike: (id: string) => void;
}) {
  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      <View style={styles.postHeader}>
        <FeedAvatar item={item} colors={colors} />
        <View style={styles.authorBlock}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>{item.author}</Text>
          <Text style={[styles.timestamp, { color: colors.navInactive }]}>
            {relativeTime(item.createdAt)}
          </Text>
        </View>
        {item.type === 'announcement' ? (
          <View style={[styles.boxTag, { backgroundColor: colors.warningBackground }]}>
            <Text style={[styles.boxTagText, { color: colors.navActive }]}>BOX</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.postBody, { color: colors.foreground }]}>{item.body}</Text>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.postImage} contentFit="cover" />
      ) : null}
      <FeedActions item={item} colors={colors} onLike={onLike} />
    </View>
  );
}

function EventCard({
  item,
  colors,
  onLike,
}: {
  item: FeedEvent;
  colors: ReturnType<typeof useColors>;
  onLike: (id: string) => void;
}) {
  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      <View style={styles.flyer}>
        <LinearGradient
          colors={[colors.navFloating, colors.navActive]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={LOGO} style={styles.flyerLogo} contentFit="contain" />
        <View style={[styles.eventTag, { backgroundColor: colors.navActive }]}>
          <Text style={[styles.eventTagText, { color: colors.card }]}>Competencia</Text>
        </View>
        <View style={styles.flyerCopy}>
          <Text style={[styles.flyerKicker, { color: colors.navFloatingForeground }]}>WODPLACE PRESENTA</Text>
          <Text style={[styles.flyerTitle, { color: colors.card }]}>COPA{"\n"}PROVIDENCIA</Text>
          <View style={[styles.flyerLine, { backgroundColor: colors.eventBlue }]} />
        </View>
      </View>
      <View style={styles.eventDetails}>
        <Text style={[styles.eventTitle, { color: colors.foreground }]}>{item.title}</Text>
        <View style={styles.eventMeta}>
          <Feather name="calendar" size={14} color={colors.eventBlue} />
          <Text style={[styles.eventDate, { color: colors.navInactive }]}>{item.dateLabel}</Text>
        </View>
        <FeedActions item={item} colors={colors} onLike={onLike} />
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>(INITIAL_FEED);
  const [composerVisible, setComposerVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(FEED_STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const stored = JSON.parse(raw) as FeedItem[];
          if (Array.isArray(stored) && stored.length > 0) setFeed(stored);
        } catch {
          // Ignore malformed local data and keep the seeded feed visible.
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const orderedFeed = useMemo(
    () => [...feed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [feed],
  );

  if (!user) return null;

  const persistFeed = (nextFeed: FeedItem[]) => {
    AsyncStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(nextFeed)).catch(() => {});
  };

  const toggleLike = (id: string) => {
    const nextFeed = feed.map((item) => {
      if (item.id !== id || item.type === 'event') return item;
      const likedByMe = !item.likedByMe;
      return { ...item, likedByMe, likes: Math.max(0, item.likes + (likedByMe ? 1 : -1)) };
    });
    setFeed(nextFeed);
    persistFeed(nextFeed);
  };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para adjuntar una imagen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.82,
    });
    if (!result.canceled && result.assets[0]) setSelectedImage(result.assets[0].uri);
  };

  const closeComposer = () => {
    setComposerVisible(false);
    setDraft('');
    setSelectedImage(null);
  };

  const publishPost = () => {
    const body = draft.trim();
    if (!body && !selectedImage) return;
    const post: FeedPost = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'post',
      author: user.name,
      avatarUri: user.avatarUri,
      body: body || 'Compartió una foto con la comunidad.',
      imageUri: selectedImage ?? undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
    };
    const nextFeed = [post, ...feed];
    setFeed(nextFeed);
    persistFeed(nextFeed);
    closeComposer();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 122 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
            <View>
              <Text style={[styles.headerKicker, { color: colors.navInactive }]}>COMUNIDAD</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>WOD SOCIAL</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear una publicación"
            onPress={() => setComposerVisible(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.navFloating },
              pressed && styles.addButtonPressed,
            ]}
          >
            <Feather name="plus" size={23} color={colors.navFloatingForeground} />
          </Pressable>
        </View>

        <View style={[styles.feedIntro, { borderBottomColor: colors.navBorder }]}>
          <Text style={[styles.feedIntroTitle, { color: colors.foreground }]}>
            Lo último del box
          </Text>
          <Text style={[styles.feedIntroText, { color: colors.navInactive }]}>
            Comparte, celebra y acompaña a tu comunidad.
          </Text>
        </View>

        <View style={styles.feed}>
          {orderedFeed.map((item) =>
            item.type === 'event' ? (
              <EventCard key={item.id} item={item} colors={colors} onLike={toggleLike} />
            ) : (
              <PostCard key={item.id} item={item} colors={colors} onLike={toggleLike} />
            ),
          )}
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        animationType="slide"
        transparent
        visible={composerVisible}
        onRequestClose={closeComposer}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.foreground + '66' }]}>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.composerSheet, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.navBorder }]} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetKicker, { color: colors.navInactive }]}>WOD SOCIAL</Text>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Nueva publicación</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closeComposer}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.composerAuthor}>
              <FeedAvatar
                colors={colors}
                item={{
                  id: 'composer',
                  type: 'post',
                  author: user.name,
                  avatarUri: user.avatarUri,
                  body: '',
                  createdAt: '',
                  likes: 0,
                  comments: 0,
                }}
                size={38}
              />
              <Text style={[styles.composerAuthorName, { color: colors.foreground }]}>
                {user.name}
              </Text>
            </View>

            <TextInput
              autoFocus
              multiline
              value={draft}
              onChangeText={setDraft}
              placeholder="¿Qué quieres compartir con el box?"
              placeholderTextColor={colors.navInactive}
              style={[styles.composerInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.navBorder }]}
              textAlignVertical="top"
              maxLength={500}
            />

            {selectedImage ? (
              <View style={styles.selectedImageWrap}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar foto"
                  onPress={() => setSelectedImage(null)}
                  style={[styles.removeImage, { backgroundColor: colors.navFloating }]}
                >
                  <Feather name="x" size={16} color={colors.navFloatingForeground} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.composerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adjuntar foto"
                onPress={chooseImage}
                style={({ pressed }) => [styles.attachButton, { borderColor: colors.navBorder }, pressed && styles.pressed]}
              >
                <Feather name="image" size={18} color={colors.navActive} />
                <Text style={[styles.attachText, { color: colors.foreground }]}>Añadir foto</Text>
              </Pressable>
              <Text style={[styles.characterCount, { color: colors.navInactive }]}>
                {draft.length}/500
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Publicar"
              disabled={!draft.trim() && !selectedImage}
              onPress={publishPost}
              style={({ pressed }) => [
                styles.publishButton,
                {
                  backgroundColor:
                    draft.trim() || selectedImage ? colors.navActive : colors.navBorder,
                },
                pressed && styles.publishPressed,
              ]}
            >
              <Text
                style={[
                  styles.publishText,
                  {
                    color: draft.trim() || selectedImage ? colors.card : colors.navInactive,
                  },
                ]}
              >
                Publicar
              </Text>
              <Feather
                name="arrow-up-right"
                size={17}
                color={draft.trim() || selectedImage ? colors.card : colors.navInactive}
              />
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 46, height: 46 },
  headerKicker: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: 0.4,
    fontFamily: 'Anton_400Regular',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 },
  feedIntro: {
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedIntroTitle: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  feedIntroText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    fontFamily: 'Inter_500Medium',
  },
  feed: { gap: 12, paddingTop: 14 },
  postCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitials: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  authorBlock: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  timestamp: { fontSize: 11, marginTop: 2, fontFamily: 'Inter_500Medium' },
  boxTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  boxTagText: { fontSize: 9, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  postBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    fontFamily: 'Inter_500Medium',
  },
  postImage: { width: '100%', height: 190, borderRadius: 14, marginTop: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 15 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  eventCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  flyer: { height: 190, overflow: 'hidden', position: 'relative', padding: 18 },
  flyerLogo: {
    position: 'absolute',
    width: 220,
    height: 220,
    right: -34,
    top: -16,
    opacity: 0.18,
  },
  eventTag: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  eventTagText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  flyerCopy: { marginTop: 25 },
  flyerKicker: { fontSize: 9, letterSpacing: 1.5, fontFamily: 'Inter_700Bold' },
  flyerTitle: {
    fontSize: 32,
    lineHeight: 31,
    marginTop: 6,
    fontFamily: 'Anton_400Regular',
  },
  flyerLine: { width: 55, height: 4, borderRadius: 2, marginTop: 13 },
  eventDetails: { padding: 15 },
  eventTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  eventDate: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  composerSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 30,
    minHeight: 420,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetKicker: { fontSize: 9, letterSpacing: 1.4, fontFamily: 'Inter_700Bold' },
  sheetTitle: { fontSize: 24, marginTop: 2, fontFamily: 'Anton_400Regular' },
  composerAuthor: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginBottom: 12 },
  composerAuthorName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  composerInput: {
    minHeight: 126,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Inter_400Regular',
  },
  selectedImageWrap: { height: 170, marginTop: 12, borderRadius: 15, overflow: 'hidden' },
  selectedImage: { width: '100%', height: '100%' },
  removeImage: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  attachText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  characterCount: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  publishButton: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
  },
  publishText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  publishPressed: { opacity: 0.85 },
  pressed: { opacity: 0.65 },
});