import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView } from '@/src/components/Motion';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii, shadows } from '@/src/theme';

const filters = ['Active', 'Lost', 'Found', 'Resolved'] as const;

export default function LostFoundScreen() {
  const [filter, setFilter] = useState<typeof filters[number]>('Active');
  const alerts = useAppStore((state) => state.lostFoundAlerts);
  const resolveAlert = useAppStore((state) => state.resolveLostFoundAlert);
  const report = useAppStore((state) => state.reportContent);
  const startConversation = useAppStore((state) => state.startConversation);
  const visible = alerts.filter((item) => filter === 'Active' ? !item.resolved : filter === 'Resolved' ? item.resolved : item.kind === filter.toLowerCase() && !item.resolved);
  const showError = (error: unknown) => Alert.alert('Could not complete that', error instanceof Error ? error.message : 'Please try again.');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={<View><ScreenHeader eyebrow="COMMUNITY RESPONSE" title="Lost & found" right={<Pressable onPress={() => router.push('/(tabs)/create')} style={styles.add}><Feather name="plus" size={20} color={colors.white} /></Pressable>} /><View style={styles.notice}><View style={styles.noticeIcon}><Feather name="radio" size={20} color={colors.coral} /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Nearby alerts, without private details</Text><Text style={styles.noticeBody}>Contact stays in Wilver. Exact addresses and phone numbers never need to be public.</Text></View></View><View style={styles.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</View></View>}
        ListEmptyComponent={<EmptyState icon="check-circle" title="Nothing to show" body="There are no alerts in this category right now." actionLabel={filter === 'Active' ? 'Create an alert' : undefined} onAction={filter === 'Active' ? () => router.push({ pathname: '/(tabs)/create', params: { type: 'lost' } }) : undefined} />}
        renderItem={({ item, index }) => <FadeInView delay={index * 60}><View style={[styles.card, item.resolved && styles.cardResolved]}><View style={styles.imageWrap}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={200} /> : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.imageEmoji}>🐾</Text></View>}{item.urgent && !item.resolved && <View style={styles.urgent}><View style={styles.urgentDot} /><Text style={styles.urgentText}>URGENT</Text></View>}<View style={[styles.kind, item.kind === 'found' && styles.kindFound]}><Text style={[styles.kindText, item.kind === 'found' && styles.kindTextFound]}>{item.resolved ? 'RESOLVED' : item.kind.toUpperCase()}</Text></View></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><View style={styles.meta}><Feather name="map-pin" size={12} color={colors.inkMuted} /><Text style={styles.metaText}>{item.neighborhood} · privacy-safe area</Text><Text style={styles.dot}>·</Text><Text style={styles.metaText}>{item.lastSeen}</Text></View><Text style={styles.description}>{item.description}</Text><View style={styles.actions}>{item.createdByCurrentUser && !item.resolved ? <Button label="View sightings" onPress={() => router.push({ pathname: '/alert-sightings', params: { id: item.id } })} style={styles.mainAction} /> : !item.resolved ? <Button label={item.kind === 'lost' ? 'I saw this pet' : 'I know this pet'} onPress={() => router.push({ pathname: '/alert-sightings', params: { id: item.id } })} style={styles.mainAction} /> : <View style={styles.resolved}><Feather name="check-circle" size={15} color={colors.green} /><Text style={styles.resolvedText}>Community update closed</Text></View>}{!item.createdByCurrentUser && !item.resolved && <Pressable onPress={() => { void startConversation(item.creator.id).then((conversationId) => router.push({ pathname: '/chat/[id]', params: { id: conversationId } })).catch(showError); }} style={styles.flag} accessibilityLabel="Message alert owner"><Feather name="message-circle" size={17} color={colors.green} /></Pressable>}<Pressable onPress={() => { void report('alert', item.id, item.title, 'Potentially inaccurate or unsafe alert').then(() => Alert.alert('Report received')).catch(showError); }} style={styles.flag} accessibilityLabel="Report alert"><Feather name="flag" size={17} color={colors.inkMuted} /></Pressable></View>{item.createdByCurrentUser && !item.resolved && <Pressable onPress={() => Alert.alert('Mark this alert resolved?', 'Nearby alerts will stop, but the post remains visible in Resolved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Resolve', onPress: () => { void resolveAlert(item.id).catch(showError); } }])} style={styles.resolveLink}><Text style={styles.resolveLinkText}>Mark alert resolved</Text></Pressable>}</View></View></FadeInView>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 36 },
  add: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radii.lg, padding: 14, marginTop: 18 },
  noticeIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1, marginLeft: 11 },
  noticeTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  noticeBody: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  filters: { flexDirection: 'row', gap: 7, marginVertical: 17 },
  filter: { flex: 1, paddingVertical: 9, borderRadius: radii.pill, alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.inkMuted, fontSize: 9, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, overflow: 'hidden', ...shadows.card },
  cardResolved: { opacity: 0.72 },
  imageWrap: { height: 198 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, imageEmoji: { fontSize: 46 },
  urgent: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.danger, borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 6 },
  urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  urgentText: { color: colors.white, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  kind: { position: 'absolute', right: 12, bottom: 12, backgroundColor: colors.coral, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6 },
  kindFound: { backgroundColor: colors.greenSoft },
  kindText: { color: colors.white, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  kindTextFound: { color: colors.greenDark },
  copy: { padding: 15 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  metaText: { color: colors.inkMuted, fontSize: 9, fontWeight: '600' },
  dot: { color: colors.inkMuted, fontSize: 9 },
  description: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 9 },
  mainAction: { flex: 1, minHeight: 46 },
  flag: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  resolved: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 13 },
  resolvedText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  resolveLink: { alignSelf: 'center', padding: 9, marginTop: 4 },
  resolveLinkText: { color: colors.green, fontSize: 10, fontWeight: '800' },
});
