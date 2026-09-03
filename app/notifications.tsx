import { Feather } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView } from '@/src/components/Motion';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { enablePushNotifications, getPushPermissionStatus } from '@/src/lib/pushNotifications';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

const icons = { like: 'heart', comment: 'message-circle', message: 'send', activity: 'calendar', alert: 'alert-circle', moderation: 'shield', connection: 'user-plus' } as const;
const fills = { like: colors.coralSoft, comment: colors.blueSoft, message: colors.greenSoft, activity: colors.yellowSoft, alert: colors.dangerSoft, moderation: colors.lilacSoft, connection: colors.greenSoft } as const;

export default function NotificationsScreen() {
  const notifications = useAppStore((state) => state.notifications);
  const markRead = useAppStore((state) => state.markNotificationRead);
  const markAll = useAppStore((state) => state.markAllNotificationsRead);
  const unread = notifications.filter((item) => !item.read).length;
  const [pushStatus, setPushStatus] = useState<'loading' | 'enabled' | 'available' | 'blocked' | 'unsupported'>('loading');
  const [enablingPush, setEnablingPush] = useState(false);
  useEffect(() => { void getPushPermissionStatus().then(setPushStatus); }, []);
  const enablePush = async () => {
    setEnablingPush(true);
    try {
      await enablePushNotifications();
      setPushStatus('enabled');
    } catch (error) {
      setPushStatus(await getPushPermissionStatus());
      Alert.alert('Could not enable push', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<View style={styles.header}><ScreenHeader eyebrow={`${unread} UNREAD`} title="Notifications" right={unread > 0 ? <Pressable onPress={() => { void markAll(); }} style={styles.mark}><Text style={styles.markText}>Mark all read</Text></Pressable> : undefined} />{pushStatus !== 'unsupported' && <View style={styles.pushCard}><View style={styles.pushIcon}><Feather name={pushStatus === 'enabled' ? 'bell' : 'bell-off'} size={18} color={colors.green} /></View><View style={styles.pushCopy}><Text style={styles.pushTitle}>{pushStatus === 'enabled' ? 'Push notifications enabled' : pushStatus === 'blocked' ? 'Push notifications are blocked' : 'Get timely community updates'}</Text><Text style={styles.pushBody}>{pushStatus === 'enabled' ? 'New messages and important activity can reach this device.' : pushStatus === 'blocked' ? 'Enable Wilver notifications from your device settings.' : 'You choose whether this device receives push alerts.'}</Text></View>{pushStatus === 'available' && <Pressable disabled={enablingPush} onPress={() => { void enablePush(); }} style={styles.enable}><Text style={styles.enableText}>{enablingPush ? 'Enabling…' : 'Enable'}</Text></Pressable>}</View>}</View>}
        ListEmptyComponent={<EmptyState icon="bell" title="All quiet" body="Likes, messages, activities, and nearby alerts will appear here." />}
        renderItem={({ item, index }) => <FadeInView delay={index * 45}><Pressable onPress={() => { void markRead(item.id); if (item.route) router.push(item.route as Href); }} style={[styles.row, !item.read && styles.rowUnread]}><View style={[styles.icon, { backgroundColor: fills[item.kind] }]}>{item.actor ? <Avatar uri={item.actor.avatarUrl} size={44} verified={item.actor.verified} /> : <Feather name={icons[item.kind]} size={20} color={item.kind === 'alert' ? colors.danger : colors.green} />}{!item.read && <View style={styles.dot} />}</View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.time}>{item.createdAt}</Text></View>{item.route && <Feather name="chevron-right" size={17} color={colors.inkSoft} />}</Pressable></FadeInView>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 36 },
  header: { marginBottom: 14 },
  pushCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 12, marginTop: 14 },
  pushIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pushCopy: { flex: 1, marginLeft: 10 },
  pushTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  pushBody: { color: colors.inkMuted, fontSize: 8, lineHeight: 12, marginTop: 2 },
  enable: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.green, borderRadius: 10 },
  enableText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  mark: { paddingHorizontal: 10, paddingVertical: 8 },
  markText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, borderRadius: radii.md },
  rowUnread: { backgroundColor: colors.white },
  icon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: -1, top: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.white },
  copy: { flex: 1, marginLeft: 12 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  body: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  time: { color: colors.coralDark, fontSize: 9, fontWeight: '700', marginTop: 5 },
  separator: { height: 5 },
});
