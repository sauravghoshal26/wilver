import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView } from '@/src/components/Motion';
import { PageHeader } from '@/src/components/PageHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function MessagesScreen() {
  const [query, setQuery] = useState('');
  const conversations = useAppStore((state) => state.conversations);
  const blocked = useAppStore((state) => state.blockedUserIds);
  const visible = conversations.filter((item) => !blocked.includes(item.parent.id)
    && `${item.parent.name} ${item.parent.pets[0]?.name} ${item.preview}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PageHeader eyebrow="YOUR CIRCLE" title="Messages" actionIcon="user-plus" actionLabel="Find pet parents" onAction={() => router.push('/(tabs)/discover')} />
        <View style={styles.search}><Feather name="search" size={17} color={colors.inkMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search conversations" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Search conversations" /></View>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState icon="message-circle" title={query ? 'No conversations found' : 'Start a safe conversation'} body={query ? 'Try another search.' : 'Find a nearby pet parent, request a connection, and keep contact inside Wilver.'} actionLabel={!query ? 'Discover pet parents' : undefined} onAction={!query ? () => router.push('/(tabs)/discover') : undefined} />}
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 45}>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} accessibilityRole="button" onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}>
              <View><Avatar uri={item.parent.avatarUrl} size={56} verified={item.parent.verified} />{item.unread > 0 && <View style={styles.online} />}</View>
              <View style={styles.copy}><View style={styles.nameRow}><Text style={styles.name}>{item.parent.name}</Text><Text style={[styles.time, item.unread > 0 && styles.timeUnread]}>{item.time}</Text></View><View style={styles.messageRow}><Text numberOfLines={1} style={[styles.message, item.unread > 0 && styles.messageUnread]}>{item.preview}</Text>{item.unread > 0 && <View style={styles.unread}><Text style={styles.unreadText}>{item.unread}</Text></View>}</View><View style={styles.context}>{item.parent.pets[0] && <Text style={styles.pet}>🐾 {item.parent.pets[0].name}</Text>}<Text style={styles.connection}>{item.connected ? 'In your circle' : 'Community message'}</Text></View></View>
            </Pressable>
          </FadeInView>
        )}
        ListFooterComponent={<View style={styles.encryption}><Feather name="shield" size={14} color={colors.green} /><Text style={styles.encryptionText}>Keep contact details private. Block and report controls are always available.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { padding: 16, paddingBottom: 10 },
  search: { height: 48, marginTop: 15, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, height: '100%', color: colors.ink, fontSize: 14 },
  list: { padding: 16, paddingTop: 4, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 86, paddingVertical: 10, borderRadius: radii.md },
  rowPressed: { opacity: 0.7 },
  online: { position: 'absolute', width: 13, height: 13, borderRadius: 7, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.canvas, bottom: 0, right: 0 },
  copy: { flex: 1, marginLeft: 13 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  time: { color: colors.inkMuted, fontSize: 10 },
  timeUnread: { color: colors.coralDark, fontWeight: '800' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  message: { flex: 1, color: colors.inkMuted, fontSize: 13 },
  messageUnread: { color: colors.ink, fontWeight: '700' },
  unread: { minWidth: 21, height: 21, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  context: { flexDirection: 'row', gap: 8, marginTop: 6 },
  pet: { color: colors.green, fontSize: 9, fontWeight: '800' },
  connection: { color: colors.inkMuted, fontSize: 9 },
  separator: { height: 1, backgroundColor: colors.line, marginLeft: 69 },
  encryption: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 30, paddingHorizontal: 18 },
  encryptionText: { flex: 1, color: colors.inkMuted, fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
