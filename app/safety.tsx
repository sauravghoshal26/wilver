import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { Button } from '@/src/components/Button';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Toggle } from '@/src/components/Toggle';
import { supabase } from '@/src/lib/supabase';
import { getCurrentArea } from '@/src/lib/location';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';
import { PrivacyPreferences } from '@/src/types/models';

const messageOptions: { value: PrivacyPreferences['allowMessages']; label: string }[] = [
  { value: 'connections', label: 'My circle' }, { value: 'everyone', label: 'Everyone' }, { value: 'nobody', label: 'Nobody' },
];

export default function SafetyScreen() {
  const preferences = useAppStore((state) => state.privacyPreferences);
  const setPreference = useAppStore((state) => state.setPrivacyPreference);
  const blockedIds = useAppStore((state) => state.blockedUserIds);
  const blockedProfiles = useAppStore((state) => state.blockedProfiles);
  const unblock = useAppStore((state) => state.unblockUser);
  const setSession = useAppStore((state) => state.setSession);
  const updateLocation = useAppStore((state) => state.updateLocation);
  const clearLocation = useAppStore((state) => state.clearLocation);
  const currentUser = useAppStore((state) => state.currentUser);
  const blocked = blockedProfiles.filter((parent) => blockedIds.includes(parent.id));
  const showError = (error: unknown) => Alert.alert('Could not complete that', error instanceof Error ? error.message : 'Please try again.');
  const refreshLocation = async () => {
    try {
      const area = await getCurrentArea();
      await updateLocation(area);
      Alert.alert('Nearby area updated', area.neighborhood || area.city || 'Your current GPS position is now stored privately.');
    } catch (error) { showError(error); }
  };
  const removeLocation = () => Alert.alert('Remove saved GPS location?', 'Nearby discovery and location-based alerts will stop until you add it again. Your public area label can remain on your profile.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove GPS', style: 'destructive', onPress: () => { void clearLocation().catch(showError); } },
  ]);

  const deleteAccount = () => Alert.alert('Permanently delete your Wilver account?', 'This permanently deletes your authentication identity and cascades account-owned database records. This action cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: async () => {
      try {
        if (!supabase) throw new Error('Account controls are temporarily unavailable. Please try again shortly.');
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) throw error;
        setSession(null);
        router.replace('/(auth)/welcome');
      } catch (error) { showError(error); }
    } },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="YOU’RE IN CONTROL" title="Safety & privacy" subtitle="Precise home details are never shown publicly." />
        <View style={styles.hero}><View style={styles.heroIcon}><Feather name="shield" size={24} color={colors.green} /></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>Privacy by default</Text><Text style={styles.heroBody}>Discovery uses a general area and distance bands. Activity meeting points stay locked until approval.</Text></View></View>

        <Text style={styles.sectionTitle}>Discovery</Text>
        <View style={styles.card}>
          <SettingRow icon="compass" title="Appear in discovery" body="Let nearby pet parents find your public profile." control={<Toggle value={preferences.discoverable} onValueChange={(value) => { void setPreference('discoverable', value).catch(showError); }} label="Appear in discovery" />} />
          <View style={styles.divider} />
          <SettingRow icon="map-pin" title="Use approximate area" body="Show a privacy-safe neighbourhood rather than exact coordinates." control={<Toggle value={preferences.approximateLocation} onValueChange={(value) => { void setPreference('approximateLocation', value).catch(showError); }} label="Use approximate area" disabled />} />
          <View style={styles.divider} />
          <SettingRow icon="radio" title="Nearby lost-pet alerts" body="Receive urgent alerts relevant to your approximate area." control={<Toggle value={preferences.nearbyAlerts} onValueChange={(value) => { void setPreference('nearbyAlerts', value).catch(showError); }} label="Nearby alerts" />} />
        </View>
        <View style={styles.locationActions}><View style={styles.locationCopy}><Text style={styles.locationTitle}>Saved area</Text><Text style={styles.locationMeta}>{currentUser?.neighborhood || 'No GPS area saved'} · exact coordinates stay private</Text></View><Button label="Update GPS" onPress={() => { void refreshLocation(); }} variant="secondary" style={styles.locationButton} /><Pressable onPress={removeLocation} style={styles.removeLocation} accessibilityLabel="Remove saved GPS location"><Feather name="trash-2" size={17} color={colors.danger} /></Pressable></View>

        <Text style={styles.sectionTitle}>Who can message you?</Text>
        <View style={styles.segment}>{messageOptions.map((option) => <Pressable key={option.value} onPress={() => { void setPreference('allowMessages', option.value).catch(showError); }} style={[styles.segmentButton, preferences.allowMessages === option.value && styles.segmentActive]}><Text style={[styles.segmentText, preferences.allowMessages === option.value && styles.segmentTextActive]}>{option.label}</Text></Pressable>)}</View>
        <Text style={styles.helper}>People you block cannot discover, message, or interact with you. Existing connections are removed.</Text>

        <View style={styles.sectionHead}><Text style={styles.sectionTitleInline}>Blocked accounts</Text><Text style={styles.count}>{blocked.length}</Text></View>
        <View style={styles.card}>{blocked.length === 0 ? <View style={styles.empty}><Feather name="user-check" size={20} color={colors.green} /><Text style={styles.emptyText}>You haven’t blocked anyone.</Text></View> : blocked.map((parent, index) => <View key={parent.id} style={[styles.blocked, index < blocked.length - 1 && styles.blockedBorder]}><Avatar uri={parent.avatarUrl} size={42} /><View style={styles.blockedCopy}><Text style={styles.blockedName}>{parent.name}</Text><Text style={styles.blockedMeta}>{parent.handle}</Text></View><Pressable onPress={() => { void unblock(parent.id).catch(showError); }} style={styles.unblock}><Text style={styles.unblockText}>Unblock</Text></Pressable></View>)}</View>

        <Text style={styles.sectionTitle}>Community commitments</Text>
        <View style={styles.guidelines}>{[
          ['heart', 'Be kind to people and animals'], ['eye-off', 'Never expose private addresses'], ['dollar-sign', 'No animal sales or financial solicitation'], ['alert-triangle', 'Report urgent harm; contact local services for emergencies'],
        ].map(([icon, label]) => <View key={label} style={styles.guideline}><View style={styles.guidelineIcon}><Feather name={icon as keyof typeof Feather.glyphMap} size={16} color={colors.green} /></View><Text style={styles.guidelineText}>{label}</Text></View>)}</View>
        <Button label="Read the full community guidelines" onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'guidelines' } })} variant="secondary" style={styles.guidelineButton} />
        <Text style={styles.disclaimer}>Wilver is not an emergency, veterinary, animal-control, or legal service.</Text>

        <View style={styles.danger}><View style={styles.dangerCopy}><Text style={styles.dangerTitle}>Delete account</Text><Text style={styles.dangerBody}>Permanently close your account and begin the data-retention workflow.</Text></View><Pressable onPress={deleteAccount} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ icon, title, body, control }: { icon: keyof typeof Feather.glyphMap; title: string; body: string; control: React.ReactNode }) {
  return <View style={styles.setting}><View style={styles.settingIcon}><Feather name={icon} size={17} color={colors.green} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingBody}>{body}</Text></View>{control}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 16, paddingBottom: 42 },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenSoft, borderRadius: radii.lg, padding: 15, marginTop: 18 },
  heroIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, marginLeft: 12 },
  heroTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, heroBody: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  setting: { minHeight: 82, flexDirection: 'row', alignItems: 'center' }, settingIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, marginHorizontal: 10 }, settingTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, settingBody: { color: colors.inkMuted, fontSize: 9, lineHeight: 13, marginTop: 3 }, divider: { height: 1, backgroundColor: colors.line, marginLeft: 48 },
  segment: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radii.md, padding: 4, borderWidth: 1, borderColor: colors.line }, segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14 }, segmentActive: { backgroundColor: colors.green }, segmentText: { color: colors.inkMuted, fontSize: 10, fontWeight: '800' }, segmentTextActive: { color: colors.white },
  helper: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, marginTop: 8 },
  locationActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 12, borderWidth: 1, borderColor: colors.line, marginTop: 10 },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  locationMeta: { color: colors.inkMuted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  locationButton: { minHeight: 40, paddingHorizontal: 10 },
  removeLocation: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 25, marginBottom: 10 }, sectionTitleInline: { color: colors.ink, fontSize: 18, fontWeight: '800' }, count: { color: colors.white, backgroundColor: colors.inkMuted, fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  empty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 22 }, emptyText: { color: colors.inkMuted, fontSize: 11 },
  blocked: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }, blockedBorder: { borderBottomWidth: 1, borderBottomColor: colors.line }, blockedCopy: { flex: 1, marginLeft: 10 }, blockedName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, blockedMeta: { color: colors.inkMuted, fontSize: 9, marginTop: 2 }, unblock: { paddingHorizontal: 10, paddingVertical: 8 }, unblockText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  guidelines: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.line }, guideline: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, guidelineIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, guidelineText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700' },
  guidelineButton: { marginTop: 10 },
  disclaimer: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: 20, marginTop: 12 },
  danger: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radii.lg, padding: 15, marginTop: 28 }, dangerCopy: { flex: 1 }, dangerTitle: { color: colors.danger, fontSize: 13, fontWeight: '800' }, dangerBody: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, marginTop: 3 }, delete: { paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.white, borderRadius: 12 }, deleteText: { color: colors.danger, fontSize: 10, fontWeight: '900' },
});
