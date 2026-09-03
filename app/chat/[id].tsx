import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { pickSanitizedImage, SanitizedImage } from '@/src/lib/media';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<SanitizedImage | null>(null);
  const lastSent = useRef(0);
  const currentUser = useAppStore((state) => state.currentUser);
  const conversation = useAppStore((state) => state.conversations.find((item) => item.id === id));
  const allMessages = useAppStore((state) => state.messages);
  const messages = allMessages.filter((message) => message.conversationId === id);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const markRead = useAppStore((state) => state.markConversationRead);
  const blockUser = useAppStore((state) => state.blockUser);
  const report = useAppStore((state) => state.reportContent);

  useEffect(() => { if (id) void markRead(id).catch(() => undefined); }, [id, markRead]);

  if (!conversation) return <SafeAreaView style={styles.safe}><EmptyState icon="message-circle" title="Conversation unavailable" body="This conversation may have been removed." /></SafeAreaView>;

  const send = async () => {
    const clean = body.trim();
    if ((!clean && !photo) || Date.now() - lastSent.current < 700) return;
    lastSent.current = Date.now();
    setBody('');
    const selectedPhoto = photo;
    setPhoto(null);
    try {
      await sendMessage(conversation.id, clean, selectedPhoto);
    } catch (error) {
      setBody(clean);
      setPhoto(selectedPhoto);
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const attach = async () => {
    try {
      const selected = await pickSanitizedImage([4, 3]);
      if (selected) setPhoto(selected);
    } catch (error) {
      Alert.alert('Could not attach photo', error instanceof Error ? error.message : 'Please try another image.');
    }
  };

  const openSafety = () => Alert.alert(conversation.parent.name, 'Safety controls', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Report', onPress: () => { void report('profile', conversation.parent.id, conversation.parent.name, 'Unsafe direct message').then(() => Alert.alert('Report received', 'The safety team can review this conversation.')).catch((error: unknown) => Alert.alert('Report failed', error instanceof Error ? error.message : 'Please try again.')); } },
    { text: 'Block', style: 'destructive', onPress: () => { void blockUser(conversation.parent.id).then(() => router.back()).catch((error: unknown) => Alert.alert('Block failed', error instanceof Error ? error.message : 'Please try again.')); } },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back"><Feather name="arrow-left" size={21} color={colors.ink} /></Pressable><Avatar uri={conversation.parent.avatarUrl} size={43} verified={conversation.parent.verified} /><View style={styles.headerCopy}><Text style={styles.name}>{conversation.parent.name}</Text><Text style={styles.pet}>{conversation.parent.pets[0] ? `with ${conversation.parent.pets[0].name} · ` : ''}{conversation.connected ? 'in your circle' : 'not in your circle'}</Text></View><Pressable onPress={openSafety} style={styles.more} accessibilityLabel="Conversation safety controls"><Feather name="more-horizontal" size={21} color={colors.ink} /></Pressable></View>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View style={styles.safety}><Feather name="shield" size={14} color={colors.green} /><Text style={styles.safetyText}>Wilver chat keeps your phone number private. Never send money or sensitive documents.</Text></View>}
          renderItem={({ item }) => {
            const mine = item.senderId === currentUser?.id;
            return <View style={[styles.messageRow, mine && styles.messageRowMine]}><View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>{item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.messageImage} contentFit="cover" />}{item.body && <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.body}</Text>}<View style={styles.timeRow}><Text style={[styles.time, mine && styles.timeMine]}>{item.createdAt}</Text>{mine && <Feather name={item.status === 'read' ? 'check-circle' : 'check'} size={10} color="rgba(255,255,255,0.68)" />}</View></View></View>;
          }}
        />
        {!conversation.connected && <View style={styles.requestNotice}><Feather name="info" size={14} color={colors.lilac} /><Text style={styles.requestText}>You are not connected. This person allows community messages; block or report if anything feels wrong.</Text></View>}
        {photo && <View style={styles.attachmentPreview}><Image source={{ uri: photo.uri }} style={styles.attachmentImage} contentFit="cover" /><View style={styles.attachmentCopy}><Text style={styles.attachmentTitle}>Photo ready</Text><Text style={styles.attachmentMeta}>Location metadata removed</Text></View><Pressable onPress={() => setPhoto(null)} style={styles.attachmentRemove} accessibilityLabel="Remove attachment"><Feather name="x" size={18} color={colors.inkMuted} /></Pressable></View>}
        <View style={styles.composer}><Pressable onPress={() => { void attach(); }} style={styles.attach} accessibilityLabel="Attach image"><Feather name="image" size={20} color={colors.green} /></Pressable><TextInput value={body} onChangeText={setBody} multiline maxLength={2000} placeholder="Message safely…" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Message" /><Pressable onPress={() => { void send(); }} disabled={!body.trim() && !photo} style={[styles.send, !body.trim() && !photo && styles.sendDisabled]} accessibilityLabel="Send message"><Feather name="arrow-up" size={20} color={colors.white} /></Pressable></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white, gap: 9 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  pet: { color: colors.inkMuted, fontSize: 9, marginTop: 3 },
  more: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: 14, paddingBottom: 22 },
  safety: { flexDirection: 'row', gap: 7, alignSelf: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 10, marginBottom: 20, maxWidth: 320 },
  safetyText: { flex: 1, color: colors.greenDark, fontSize: 9, lineHeight: 14 },
  messageRow: { alignItems: 'flex-start', marginVertical: 4 },
  messageRowMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '81%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 19 },
  bubbleMine: { backgroundColor: colors.green, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.line },
  messageText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  messageTextMine: { color: colors.white },
  messageImage: { width: 220, height: 165, borderRadius: 13, marginBottom: 7 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 5 },
  time: { color: colors.inkMuted, fontSize: 8 },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  requestNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lilacSoft, padding: 9, justifyContent: 'center' },
  requestText: { color: colors.lilac, fontSize: 9, fontWeight: '700' },
  attachmentPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenSoft, padding: 9, borderTopWidth: 1, borderTopColor: colors.line },
  attachmentImage: { width: 46, height: 46, borderRadius: 12 },
  attachmentCopy: { flex: 1, marginLeft: 9 },
  attachmentTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  attachmentMeta: { color: colors.greenDark, fontSize: 8, marginTop: 2 },
  attachmentRemove: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  attach: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 110, borderRadius: 18, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 11, color: colors.ink, fontSize: 13 },
  send: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
