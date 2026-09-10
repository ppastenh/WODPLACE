import React from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { SocialPost } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

/**
 * The 3-column photo/text grid + tap-to-expand detail sheet used by the
 * profile screen's "Publicaciones" tab — shared between the athlete's own
 * profile (app/profile.tsx) and someone else's public profile
 * (app/member/[id].tsx), so both look and behave identically.
 */

const WIN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
// 3 columns, full width, with gaps between them
const ITEM_SIZE = Math.floor((WIN_WIDTH - GRID_GAP * 2) / 3);

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

export function PostsGrid({
  posts,
  isLoading,
  isFetchingNextPage,
  hasMore,
  onFetchNextPage,
  onSelectPost,
  emptyTitle = 'Sin publicaciones aún',
  emptyText = 'Comparte algo en la Comunidad para verlo aquí.',
}: {
  posts: SocialPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  onFetchNextPage: () => void;
  onSelectPost: (post: SocialPost) => void;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const colors = useColors();
  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      numColumns={3}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.gridRow}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onFetchNextPage : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={colors.navActive} style={{ marginVertical: 16 }} />
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.navActive} style={{ margin: 40 }} />
        ) : (
          <View style={styles.emptyState}>
            <Feather name="image" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{emptyTitle}</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <PostThumb post={item} colors={colors} onPress={() => onSelectPost(item)} />
      )}
    />
  );
}

export function PostDetailModal({
  post,
  visible,
  onClose,
}: {
  post: SocialPost | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
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

const styles = StyleSheet.create({
  // Posts grid
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
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },

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
