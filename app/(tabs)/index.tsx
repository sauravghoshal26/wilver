import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/src/components/ActivityCard';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView } from '@/src/components/Motion';
import { PostCard } from '@/src/components/PostCard';
import { SectionTitle } from '@/src/components/SectionTitle';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients, radii, shadows } from '@/src/theme';

export default function HomeScreen() {
  const posts = useAppStore((state) => state.posts);
  const currentUser = useAppStore((state) => state.currentUser);
  const activities = useAppStore((state) => state.activities);
  const nearbyParents = useAppStore((state) => state.nearbyParents);
  const alerts = useAppStore((state) => state.lostFoundAlerts);
  const notifications = useAppStore((state) => state.notifications);
  const toggleLike = useAppStore((state) => state.toggleLike);
  const joined = useAppStore((state) => state.joinedActivities);
  const toggleJoin = useAppStore((state) => state.toggleJoinActivity);
  const report = useAppStore((state) => state.reportContent);
  const unread = notifications.filter((notification) => !notification.read).length;
  const firstName = currentUser?.name.split(/\s|&/)[0] || 'there';
  const actionError = (error: unknown) => Alert.alert('Could not complete that', error instanceof Error ? error.message : 'Please try again.');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <FadeInView delay={Math.min(index * 50, 200)}><PostCard post={item} onLike={() => { void toggleLike(item.id).catch(actionError); }} onComment={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })} onMore={() => item.author.id === currentUser?.id ? router.push({ pathname: '/post/[id]', params: { id: item.id } }) : Alert.alert('Post options', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', style: 'destructive', onPress: () => { void report('post', item.id, item.body.slice(0, 50), 'Potential community-guideline violation').then(() => Alert.alert('Report received')).catch(actionError); } }])} /></FadeInView>}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View><Text style={styles.hello}>YOUR LOCAL CIRCLE</Text><Text style={styles.title}>Hey, {firstName} <Text>🐾</Text></Text></View>
              <View style={styles.headerActions}><Pressable onPress={() => router.push('/notifications')} style={styles.iconButton} accessibilityLabel={`${unread} unread notifications`}><Feather name="bell" size={20} color={colors.ink} />{unread > 0 && <View style={styles.notificationDot}><Text style={styles.notificationText}>{unread}</Text></View>}</Pressable><Avatar uri={currentUser?.avatarUrl} size={42} verified={currentUser?.verified} /></View>
            </View>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroOrbOne} /><View style={styles.heroOrbTwo} />
              <View style={styles.heroCopy}><Text style={styles.heroEyebrow}>YOUR NEIGHBOURHOOD TODAY</Text><Text style={styles.heroTitle}>A good day to make a new friend.</Text><View style={styles.heroMeta}><View style={styles.liveDot} /><Text style={styles.heroMetaText}>{nearbyParents.length === 0 ? 'Your local community is just getting started' : `${nearbyParents.length} pet ${nearbyParents.length === 1 ? 'parent' : 'parents'} nearby`}</Text></View></View>
              <View style={styles.heroPets}><View style={[styles.heroPet, styles.heroPetBack]}><Text style={styles.heroEmoji}>🐈</Text></View><View style={styles.heroPet}><Text style={styles.heroEmoji}>🐕</Text></View></View>
            </LinearGradient>
            <Pressable style={styles.composer} onPress={() => router.push('/(tabs)/create')} accessibilityRole="button">
              <Avatar uri={currentUser?.avatarUrl} size={38} />
              <Text style={styles.composerText}>Share something with your community…</Text>
              <View style={styles.photoButton}><Feather name="image" size={18} color={colors.green} /></View>
            </Pressable>
            <View style={styles.quickActions}><Pressable accessibilityRole="button" accessibilityLabel="Open nearby plans" onPress={() => router.push('/activities')} style={[styles.quick, { backgroundColor: colors.greenSoft }]}><View style={styles.quickIcon}><Feather name="calendar" size={17} color={colors.green} /></View><View><Text style={styles.quickTitle}>Plans</Text><Text style={styles.quickMeta}>{activities.length} near you</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open lost and found" onPress={() => router.push('/lost-found')} style={[styles.quick, { backgroundColor: colors.coralSoft }]}><View style={styles.quickIcon}><Feather name="radio" size={17} color={colors.coral} /></View><View><Text style={styles.quickTitle}>Lost & found</Text><Text style={styles.quickMeta}>{alerts.filter((alert) => alert.urgent && !alert.resolved).length} urgent</Text></View></Pressable></View>
            <View style={styles.section}><SectionTitle title="Happening near you" action="See all" onPress={() => router.push('/activities')} /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activities}>
              {activities.slice(0, 4).map((activity) => <ActivityCard key={activity.id} activity={activity} joined={joined.includes(activity.id)} onJoin={() => { void toggleJoin(activity.id).catch(actionError); }} onOpen={() => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })} />)}
            </ScrollView>
            <View style={styles.feedTitle}><SectionTitle title="From your circle" /><View style={styles.filter}><Feather name="sliders" size={14} color={colors.green} /><Text style={styles.filterText}>For you</Text></View></View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="users" title="Your circle starts here" body="Introduce your pet and help your local community get to know you." actionLabel="Create the first post" onAction={() => router.push('/(tabs)/create')} />}
        ListFooterComponent={<View style={styles.footer}><Text style={styles.footerPaw}>🐾</Text><Text style={styles.footerText}>You’re all caught up</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 18 },
  hello: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.8, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: -2, top: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  notificationText: { color: colors.white, fontSize: 8, fontWeight: '900' },
  hero: { minHeight: 158, borderRadius: radii.xl, padding: 19, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...shadows.floating },
  heroOrbOne: { position: 'absolute', width: 145, height: 145, borderRadius: 73, right: -45, top: -64, backgroundColor: 'rgba(255,255,255,0.13)' },
  heroOrbTwo: { position: 'absolute', width: 95, height: 95, borderRadius: 48, left: -28, bottom: -59, backgroundColor: 'rgba(46,214,197,0.22)' },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.mint, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  heroTitle: { color: colors.white, fontSize: 22, lineHeight: 26, fontWeight: '900', letterSpacing: -0.6, marginTop: 7, maxWidth: 230 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.aqua },
  heroMetaText: { color: 'rgba(255,255,255,0.88)', fontSize: 9, fontWeight: '800' },
  heroPets: { width: 88, alignItems: 'center', justifyContent: 'center' },
  heroPet: { width: 59, height: 59, borderRadius: 22, backgroundColor: colors.white, borderWidth: 3, borderColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }], ...shadows.card },
  heroPetBack: { position: 'absolute', left: -1, top: -12, backgroundColor: colors.yellowSoft, transform: [{ rotate: '-9deg' }] },
  heroEmoji: { fontSize: 30 },
  composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 12, marginTop: 15, ...shadows.card },
  composerText: { flex: 1, color: colors.inkMuted, fontSize: 13, marginLeft: 10 },
  photoButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  quickActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radii.md },
  quickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  quickTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  quickMeta: { color: colors.inkMuted, fontSize: 8, marginTop: 2 },
  section: { marginTop: 26, marginBottom: 12 },
  activities: { paddingRight: 20 },
  feedTitle: { marginTop: 27, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  gap: { height: 14 },
  footer: { paddingVertical: 38, alignItems: 'center' },
  footerPaw: { fontSize: 20, opacity: 0.5 },
  footerText: { color: colors.inkMuted, fontSize: 12, marginTop: 5 },
});
