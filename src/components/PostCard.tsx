import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/Avatar';
import { colors, radii, shadows } from '@/src/theme';
import { FeedPost } from '@/src/types/models';

export function PostCard({ post, onLike, onComment, onMore }: { post: FeedPost; onLike: () => void; onComment?: () => void; onMore?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar uri={post.author.avatarUrl} size={42} verified={post.author.verified} />
        <View style={styles.authorCopy}>
          <Text style={styles.author}>{post.author.name}</Text>
          <Text style={styles.meta}>{post.neighborhood} · {post.createdAt}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={onMore} accessibilityLabel="More post options"><Feather name="more-horizontal" color={colors.inkMuted} size={20} /></Pressable>
      </View>
      <Text style={styles.body}>{post.body}</Text>
      {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.image} contentFit="cover" transition={250} />}
      <View style={styles.footer}>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={onLike} accessibilityLabel={post.liked ? 'Unlike post' : 'Like post'}>
            <Feather name="heart" color={post.liked ? colors.coral : colors.ink} size={20} fill={post.liked ? colors.coral : 'transparent'} />
            <Text style={[styles.actionText, post.liked && styles.liked]}>{post.likes}</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={onComment} accessibilityLabel="View comments">
            <Feather name="message-circle" color={colors.ink} size={20} />
            <Text style={styles.actionText}>{post.comments}</Text>
          </Pressable>
        </View>
        {post.tag && <View style={styles.tag}><Text style={styles.tagText}>{post.tag}</Text></View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, gap: 14, ...shadows.card },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorCopy: { flex: 1, marginLeft: 11 },
  author: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  image: { width: '100%', aspectRatio: 1.18, borderRadius: radii.md, backgroundColor: colors.greenSoft },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 18 },
  action: { minWidth: 32, minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  liked: { color: colors.coral },
  tag: { backgroundColor: colors.greenSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  tagText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
});
