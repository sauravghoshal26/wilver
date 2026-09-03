import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { FadeInView } from '@/src/components/Motion';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients, radii, shadows } from '@/src/theme';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = useAppStore((state) => state.activities.find((item) => item.id === id));
  const activityRequests = useAppStore((state) => state.activityRequests);
  const requests = activityRequests.filter((item) => item.activityId === id);
  const joined = useAppStore((state) => state.joinedActivities.includes(id));
  const toggleJoin = useAppStore((state) => state.toggleJoinActivity);
  const respond = useAppStore((state) => state.respondToActivityRequest);
  const cancelActivity = useAppStore((state) => state.cancelActivity);
  const report = useAppStore((state) => state.reportContent);
  const startConversation = useAppStore((state) => state.startConversation);

  if (!activity) return <SafeAreaView style={styles.safe}><View style={styles.content}><ScreenHeader title="Activity" /><EmptyState icon="calendar" title="Activity unavailable" body="It may have been cancelled or removed." /></View></SafeAreaView>;
  const showError = (error: unknown) => Alert.alert('Could not complete that', error instanceof Error ? error.message : 'Please try again.');
  const approved = activity.attendanceStatus === 'approved';

  const reportActivity = () => Alert.alert('Report activity?', 'This sends the activity to Wilver’s safety queue.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Report', style: 'destructive', onPress: () => { void report('activity', activity.id, activity.title, 'Unsafe or misleading activity').then(() => Alert.alert('Report received', 'Thank you. The host will not see who reported it.')).catch(showError); } },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Activity details" right={<Pressable onPress={reportActivity} style={styles.more} accessibilityLabel="Report activity"><Feather name="flag" size={18} color={colors.inkMuted} /></Pressable>} />
        <FadeInView>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.type}><Text style={styles.typeText}>{activity.type.toUpperCase()}</Text></View>
            <Text style={styles.heroTitle}>{activity.title}</Text>
            <View style={styles.heroMeta}><Feather name="calendar" size={15} color={colors.mint} /><Text style={styles.heroMetaText}>{activity.dateLabel}</Text></View>
            <View style={styles.heroMeta}><Feather name="map-pin" size={15} color={colors.mint} /><Text style={styles.heroMetaText}>{activity.locationLabel} · approximate area</Text></View>
            <View style={styles.blob}><Text style={styles.blobEmoji}>{activity.type === 'Walk' ? '🐕' : activity.type === 'Playdate' ? '🎾' : '🎪'}</Text></View>
          </LinearGradient>
        </FadeInView>

        <View style={styles.hostCard}><Avatar uri={activity.host.avatarUrl} size={48} verified={activity.host.verified} /><View style={styles.hostCopy}><Text style={styles.hostLabel}>{activity.hostedByCurrentUser ? 'HOSTED BY YOU' : 'YOUR HOST'}</Text><Text style={styles.hostName}>{activity.host.name}</Text><Text style={styles.hostMeta}>{activity.host.neighborhood} · {activity.host.verified ? 'verified' : 'unverified'} pet parent</Text></View><Pressable style={styles.message} onPress={() => { if (!activity.hostedByCurrentUser) void startConversation(activity.host.id).then((conversationId) => router.push({ pathname: '/chat/[id]', params: { id: conversationId } })).catch(showError); }} disabled={activity.hostedByCurrentUser}><Feather name="message-circle" size={18} color={activity.hostedByCurrentUser ? colors.inkSoft : colors.green} /></Pressable></View>

        <View style={styles.section}><Text style={styles.sectionTitle}>The plan</Text><Text style={styles.body}>{activity.description}</Text><View style={styles.compatible}><View style={styles.compatibleIcon}><Text>🐾</Text></View><View><Text style={styles.compatibleLabel}>GOOD FIT FOR</Text><Text style={styles.compatibleText}>{activity.compatiblePets}</Text></View></View></View>

        <View style={styles.section}><Text style={styles.sectionTitle}>Attendance</Text><View style={styles.attendance}><View><Text style={styles.attendanceNumber}>{activity.attendees}<Text style={styles.attendanceCapacity}>/{activity.capacity}</Text></Text><Text style={styles.attendanceLabel}>spots taken</Text></View><View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, (activity.attendees / activity.capacity) * 100)}%` }]} /></View></View></View>

        <View style={[styles.locationCard, (approved || activity.hostedByCurrentUser) && styles.locationCardApproved]}><View style={styles.lock}><Feather name={(approved || activity.hostedByCurrentUser) ? 'shield' : 'lock'} size={20} color={colors.green} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{activity.hostedByCurrentUser ? 'Private meeting point' : approved ? 'Approved meeting point' : joined ? 'Request awaiting approval' : 'Meeting point protected'}</Text><Text style={styles.locationBody}>{activity.hostedByCurrentUser || approved ? activity.exactLocationHint : 'Exact instructions appear only after the host approves attendance.'}</Text></View></View>

        {activity.hostedByCurrentUser ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join requests</Text>
            {requests.length === 0 ? <EmptyState icon="users" title="No requests yet" body="New requests will appear here for your approval." /> : requests.map((request) => <View key={request.id} style={styles.request}>{request.pet.imageUrl ? <Image source={{ uri: request.pet.imageUrl }} style={styles.pet} /> : <View style={[styles.pet, styles.petFallback]}><Text>🐾</Text></View>}<View style={styles.requestCopy}><Text style={styles.requestName}>{request.pet.name} <Text style={styles.requestParent}>with {request.parent.name}</Text></Text><Text style={styles.requestMeta}>{request.pet.breed} · {request.createdAt}</Text></View>{request.status === 'pending' ? <View style={styles.requestActions}><Pressable accessibilityRole="button" accessibilityLabel={`Decline ${request.pet.name}`} onPress={() => { void respond(request.id, 'declined').catch(showError); }} style={styles.decline}><Feather name="x" size={17} color={colors.danger} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Approve ${request.pet.name}`} onPress={() => { void respond(request.id, 'approved').catch(showError); }} style={styles.approve}><Feather name="check" size={17} color={colors.white} /></Pressable></View> : <Text style={[styles.status, request.status === 'declined' && styles.statusDeclined]}>{request.status}</Text>}</View>)}
          </View>
        ) : <Button label={joined ? 'Withdraw request' : 'Request to join'} onPress={() => { void toggleJoin(activity.id).catch(showError); }} variant={joined ? 'secondary' : 'primary'} style={styles.join} />}

        {activity.hostedByCurrentUser && <Button label="Cancel activity" onPress={() => Alert.alert('Cancel this activity?', 'The activity and attendance requests will be permanently removed.', [{ text: 'Keep activity', style: 'cancel' }, { text: 'Cancel activity', style: 'destructive', onPress: () => { void cancelActivity(activity.id).then(() => router.replace('/activities')).catch(showError); } }])} variant="ghost" style={styles.cancelActivity} />}

        <Text style={styles.disclaimer}>Meet in public where practical. Wilver does not supervise activities—leave if anything feels unsafe.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 244, borderRadius: radii.xl, padding: 20, marginTop: 18, overflow: 'hidden', justifyContent: 'flex-end', ...shadows.floating },
  type: { alignSelf: 'flex-start', backgroundColor: colors.coral, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  typeText: { color: colors.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  heroTitle: { color: colors.white, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, maxWidth: '78%', marginBottom: 12 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  heroMetaText: { color: 'rgba(255,255,255,0.84)', fontSize: 11, fontWeight: '600' },
  blob: { position: 'absolute', right: -22, top: 30, width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  blobEmoji: { fontSize: 58 },
  hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.line },
  hostCopy: { flex: 1, marginLeft: 11 },
  hostLabel: { color: colors.coralDark, fontSize: 8, letterSpacing: 0.8, fontWeight: '900' },
  hostName: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  hostMeta: { color: colors.inkMuted, fontSize: 9, marginTop: 3 },
  message: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 24 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, marginBottom: 9 },
  body: { color: colors.inkMuted, fontSize: 14, lineHeight: 21 },
  compatible: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 12, marginTop: 13 },
  compatibleIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  compatibleLabel: { color: colors.green, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  compatibleText: { color: colors.greenDark, fontSize: 11, fontWeight: '700', marginTop: 3 },
  attendance: { backgroundColor: colors.white, borderRadius: radii.md, padding: 15, borderWidth: 1, borderColor: colors.line },
  attendanceNumber: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  attendanceCapacity: { color: colors.inkMuted, fontSize: 13 },
  attendanceLabel: { color: colors.inkMuted, fontSize: 9, marginTop: 1 },
  progress: { height: 7, borderRadius: 4, backgroundColor: colors.line, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.coral },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.yellowSoft, borderRadius: radii.lg, padding: 14, marginTop: 18, borderWidth: 1, borderColor: '#ECD99C' },
  locationCardApproved: { backgroundColor: colors.greenSoft, borderColor: colors.mint },
  lock: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, marginLeft: 11 },
  locationTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  locationBody: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  request: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  pet: { width: 48, height: 48, borderRadius: 16 },
  petFallback: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  requestCopy: { flex: 1, marginLeft: 10 },
  requestName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  requestParent: { color: colors.inkMuted, fontSize: 10, fontWeight: '500' },
  requestMeta: { color: colors.inkMuted, fontSize: 9, marginTop: 4 },
  requestActions: { flexDirection: 'row', gap: 7 },
  decline: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  approve: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  status: { color: colors.green, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  statusDeclined: { color: colors.danger },
  join: { marginTop: 24 },
  cancelActivity: { marginTop: 16 },
  disclaimer: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 18, paddingHorizontal: 15 },
});
