import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { PostCard } from '@/src/components/PostCard';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState('');
  const currentUser = useAppStore((state) => state.currentUser);
  const post = useAppStore((state) => state.posts.find((item) => item.id === id));
  const allComments = useAppStore((state) => state.comments);
  const comments = allComments.filter((item) => item.postId === id);
  const toggleLike = useAppStore((state) => state.toggleLike);
  const addComment = useAppStore((state) => state.addComment);
  const deletePost = useAppStore((state) => state.deletePost);
  const report = useAppStore((state) => state.reportContent);

  if (!post) return <SafeAreaView style={styles.safe}><EmptyState icon="file-text" title="Post unavailable" body="It may have been deleted or removed." /></SafeAreaView>;
  const mine = post.author.id === currentUser?.id;
  const showError = (error: unknown) => Alert.alert('Could not complete that', error instanceof Error ? error.message : 'Please try again.');
  const options = () => mine ? Alert.alert('Post options', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete post', style: 'destructive', onPress: () => { void deletePost(post.id).then(() => router.back()).catch(showError); } }]) : Alert.alert('Report post?', 'Send this post to the safety queue?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', style: 'destructive', onPress: () => { void report('post', post.id, post.body.slice(0, 50), 'Potential community-guideline violation').then(() => Alert.alert('Report received')).catch(showError); } }]);
  const submit = async () => { const clean = body.trim(); if (!clean) return; setBody(''); try { await addComment(post.id, clean); } catch (error) { setBody(clean); showError(error); } };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList data={comments} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} ListHeaderComponent={<View><ScreenHeader title="Post" /><View style={styles.post}><PostCard post={post} onLike={() => { void toggleLike(post.id).catch(showError); }} onMore={options} /></View><Text style={styles.heading}>Comments <Text style={styles.count}>{comments.length}</Text></Text></View>} ListEmptyComponent={<EmptyState icon="message-circle" title="Start the conversation" body="Be helpful, kind, and mindful of private details." />} renderItem={({ item }) => <View style={styles.comment}><Avatar uri={item.author.avatarUrl} size={38} verified={item.author.verified} /><View style={styles.bubble}><View style={styles.commentHead}><Text style={styles.author}>{item.author.name}</Text><Text style={styles.time}>{item.createdAt}</Text></View><Text style={styles.commentBody}>{item.body}</Text></View></View>} />
        <View style={styles.composer}><Avatar uri={currentUser?.avatarUrl} size={36} /><TextInput value={body} onChangeText={setBody} maxLength={1000} placeholder="Add a kind comment…" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Comment" /><Pressable onPress={() => { void submit(); }} disabled={!body.trim()} style={[styles.send, !body.trim() && styles.sendDisabled]}><Feather name="arrow-up" size={18} color={colors.white} /></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 }, post: { marginTop: 16 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  count: { color: colors.inkMuted, fontSize: 12 },
  comment: { flexDirection: 'row', gap: 9, marginTop: 11, alignItems: 'flex-start' },
  bubble: { flex: 1, backgroundColor: colors.white, borderRadius: radii.md, borderTopLeftRadius: 5, padding: 11, borderWidth: 1, borderColor: colors.line },
  commentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { color: colors.ink, fontSize: 11, fontWeight: '800' }, time: { color: colors.inkMuted, fontSize: 8 },
  commentBody: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 5 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, height: 42, borderRadius: 18, backgroundColor: colors.canvas, paddingHorizontal: 13, color: colors.ink, fontSize: 12 },
  send: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.4 },
});
