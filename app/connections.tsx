import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function ConnectionsScreen() {
  const requests = useAppStore((state) => state.connectionRequests);
  const respond = useAppStore((state) => state.respondToConnection);
  const toggle = useAppStore((state) => state.toggleConnection);
  const [working, setWorking] = useState<string | null>(null);
  const incoming = requests.filter((request) => request.direction === 'incoming');
  const outgoing = requests.filter((request) => request.direction === 'outgoing');

  const decide = async (profileId: string, decision: 'accepted' | 'declined') => {
    setWorking(profileId);
    try { await respond(profileId, decision); }
    catch (error) { Alert.alert('Could not update request', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setWorking(null); }
  };

  const cancel = async (profileId: string) => {
    setWorking(profileId);
    try { await toggle(profileId); }
    catch (error) { Alert.alert('Could not cancel request', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setWorking(null); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="YOUR CIRCLE" title="Connection requests" subtitle="Only accept people you recognize or feel comfortable meeting in the community." />
        <Text style={styles.section}>Incoming</Text>
        {incoming.length === 0 ? <EmptyState icon="user-check" title="No pending requests" body="New requests from nearby pet parents will appear here." /> : incoming.map((request) => <View key={request.id} style={styles.card}><Avatar uri={request.profile.avatarUrl} size={48} verified={request.profile.verified} /><View style={styles.copy}><Text style={styles.name}>{request.profile.name}</Text><Text style={styles.meta}>{request.profile.handle} · {request.createdAt}</Text></View><Pressable disabled={working === request.profile.id} onPress={() => { void decide(request.profile.id, 'declined'); }} style={styles.decline} accessibilityLabel={`Decline ${request.profile.name}`}><Feather name="x" size={17} color={colors.danger} /></Pressable><Pressable disabled={working === request.profile.id} onPress={() => { void decide(request.profile.id, 'accepted'); }} style={styles.accept} accessibilityLabel={`Accept ${request.profile.name}`}><Feather name="check" size={17} color={colors.white} /></Pressable></View>)}
        {outgoing.length > 0 && <><Text style={styles.section}>Sent</Text>{outgoing.map((request) => <View key={request.id} style={styles.card}><Avatar uri={request.profile.avatarUrl} size={48} verified={request.profile.verified} /><View style={styles.copy}><Text style={styles.name}>{request.profile.name}</Text><Text style={styles.meta}>Awaiting response · {request.createdAt}</Text></View><Pressable disabled={working === request.profile.id} onPress={() => { void cancel(request.profile.id); }} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable></View>)}</>}
        <View style={styles.safety}><Feather name="shield" size={16} color={colors.green} /><Text style={styles.safetyText}>Connections can message you when your messaging preference is set to “My circle.” Blocking someone removes the connection immediately.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: colors.line },
  copy: { flex: 1, marginLeft: 10 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.inkMuted, fontSize: 9, marginTop: 3 },
  accept: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  decline: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  cancel: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: colors.canvas },
  cancelText: { color: colors.inkMuted, fontSize: 9, fontWeight: '800' },
  safety: { flexDirection: 'row', gap: 9, backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 13, marginTop: 20 },
  safetyText: { flex: 1, color: colors.greenDark, fontSize: 10, lineHeight: 15 },
});
