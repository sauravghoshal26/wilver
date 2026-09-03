import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView, MotionPressable } from '@/src/components/Motion';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients, radii, shadows } from '@/src/theme';

const filters = ['All', 'My plans', 'Hosting'] as const;
type Filter = typeof filters[number];

export default function ActivitiesScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const activities = useAppStore((state) => state.activities);
  const joined = useAppStore((state) => state.joinedActivities);
  const visible = activities.filter((activity) => filter === 'All'
    || (filter === 'Hosting' && activity.hostedByCurrentUser)
    || (filter === 'My plans' && (joined.includes(activity.id) || activity.hostedByCurrentUser)));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 13 }} />}
        ListHeaderComponent={(
          <View>
            <ScreenHeader
              eyebrow="MEET OFFLINE, SAFELY"
              title="Plans near you"
              right={<Pressable onPress={() => router.push('/(tabs)/create')} style={styles.add} accessibilityLabel="Create activity"><Feather name="plus" size={21} color={colors.white} /></Pressable>}
            />
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroIcon}><Text style={styles.heroEmoji}>🐕‍🦺</Text></View>
              <View style={styles.heroCopy}><Text style={styles.heroTitle}>Make their week bigger</Text><Text style={styles.heroBody}>Walks, playdates, and friendly local events—with precise meeting points protected.</Text></View>
            </LinearGradient>
            <View style={styles.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="calendar" title="No plans here yet" body="Create a walk, playdate, or local pet-friendly event." actionLabel="Create a plan" onAction={() => router.push({ pathname: '/(tabs)/create', params: { type: 'walk' } })} />}
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 55}>
            <MotionPressable
              style={[styles.card, { backgroundColor: item.accent }]}
              onPress={() => router.push({ pathname: '/activities/[id]', params: { id: item.id } })}
              accessibilityLabel={`Open ${item.title}`}
            >
              <View style={styles.cardInner}>
                <View style={styles.cardTop}><View style={styles.type}><Text style={styles.typeText}>{item.type}</Text></View>{item.hostedByCurrentUser && <View style={styles.hosting}><Text style={styles.hostingText}>HOSTING</Text></View>}<Text style={styles.date}>{item.dateLabel}</Text></View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                <View style={styles.meta}><Feather name="map-pin" size={14} color={colors.inkMuted} /><Text style={styles.metaText}>{item.locationLabel} · approximate area</Text></View>
                <View style={styles.bottom}><View style={styles.host}><Avatar uri={item.host.avatarUrl} size={30} verified={item.host.verified} /><Text style={styles.hostText}>{item.hostedByCurrentUser ? 'Hosted by you' : `By ${item.host.name}`}</Text></View><View style={styles.going}><Feather name="users" size={13} color={colors.green} /><Text style={styles.goingText}>{item.attendees}/{item.capacity}</Text></View><Feather name="arrow-up-right" size={18} color={colors.green} /></View>
              </View>
            </MotionPressable>
          </FadeInView>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 36 },
  add: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  hero: { borderRadius: radii.lg, marginTop: 20, padding: 17, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 28 },
  heroCopy: { flex: 1, marginLeft: 13 },
  heroTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  heroBody: { color: 'rgba(255,255,255,0.78)', fontSize: 11, lineHeight: 16, marginTop: 4 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 18 },
  filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  card: { borderRadius: radii.lg, minHeight: 218, ...shadows.card },
  cardInner: { flex: 1, padding: 17 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  type: { backgroundColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill },
  typeText: { color: colors.greenDark, fontSize: 10, fontWeight: '800' },
  hosting: { backgroundColor: colors.blue, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill },
  hostingText: { color: colors.white, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  date: { marginLeft: 'auto', color: colors.inkMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.4, marginTop: 13 },
  description: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  metaText: { color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  bottom: { marginTop: 'auto', paddingTop: 15, flexDirection: 'row', alignItems: 'center' },
  host: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7 },
  hostText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  going: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 },
  goingText: { color: colors.green, fontSize: 11, fontWeight: '800' },
});
