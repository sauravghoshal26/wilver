import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Toggle } from '@/src/components/Toggle';
import { canActivateBreedingProfile } from '@/src/lib/privacy';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients, radii } from '@/src/theme';

export default function BreedingScreen() {
  const enabled = useAppStore((state) => state.featureFlags.breeding);
  const currentUser = useAppStore((state) => state.currentUser);
  const application = useAppStore((state) => state.breedingApplication);
  const update = useAppStore((state) => state.updateBreedingApplication);
  const submit = useAppStore((state) => state.submitBreedingApplication);
  const pet = currentUser?.pets[0];
  const eligible = Boolean(pet && currentUser && canActivateBreedingProfile({ featureEnabled: enabled, adultConfirmed: application.adultConfirmed, petVerified: pet.verified, profileVerified: currentUser.verified, allowedRegion: false, acknowledged: application.acknowledged }) && application.documentsReady);
  const submitSafely = () => { void submit().catch((error: unknown) => Alert.alert('Application unavailable', error instanceof Error ? error.message : 'Please try again.')); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="WELFARE FIRST" title="Responsible breeding" subtitle="A separately controlled verification area—not a marketplace." />
        <LinearGradient colors={enabled ? gradients.brand : ['#4F635E', '#263C36']} style={styles.hero}>
          <View style={styles.heroIcon}><Feather name={enabled ? 'shield' : 'lock'} size={26} color={colors.white} /></View>
          <Text style={styles.heroLabel}>{enabled ? 'CONTROLLED ACCESS' : 'FEATURE PAUSED'}</Text>
          <Text style={styles.heroTitle}>{enabled ? 'Verification before discovery.' : 'Not available in your region yet.'}</Text>
          <Text style={styles.heroBody}>{enabled ? 'Every profile needs adult confirmation, health evidence, a verified pet, policy acknowledgement, and moderator approval.' : 'Wilver keeps this module disabled until regional legal, veterinary-welfare, and moderation review is complete.'}</Text>
        </LinearGradient>

        <View style={styles.warning}><Feather name="alert-triangle" size={18} color={colors.coralDark} /><Text style={styles.warningText}>No direct animal sales, paid placement, or unverified mating solicitation. Wilver does not provide veterinary or legal advice.</Text></View>

        <Text style={styles.sectionTitle}>Application profile</Text>
        {pet ? <View style={styles.petCard}>{pet.imageUrl ? <Image source={{ uri: pet.imageUrl }} style={styles.petImage} /> : <View style={[styles.petImage, styles.petPlaceholder]}><Text style={styles.petEmoji}>🐾</Text></View>}<View style={styles.petCopy}><Text style={styles.petName}>{pet.name}</Text><Text style={styles.petMeta}>{pet.breed} · {pet.age} · {pet.sex}</Text><View style={styles.badges}><View style={styles.badge}><Feather name={pet.verified ? 'check-circle' : 'clock'} size={11} color={colors.green} /><Text style={styles.badgeText}>{pet.verified ? 'Pet verified' : 'Not verified'}</Text></View></View></View></View> : <View style={styles.warning}><Text style={styles.warningText}>Add a pet before reviewing this controlled feature.</Text></View>}

        <Text style={styles.sectionTitle}>Eligibility & consent</Text>
        <View style={styles.checklist}>
          <ChecklistRow title="Profile and pet verified" body="Identity and pet ownership signals are current." value={Boolean(currentUser?.verified && pet?.verified)} locked />
          <ChecklistRow title="I confirm I am 18+" body="Adult confirmation is recorded separately from identity verification." value={application.adultConfirmed} onChange={(value) => update({ adultConfirmed: value })} disabled={!enabled} />
          <ChecklistRow title="Health evidence reviewed" body="A moderator—not a client toggle—must verify private veterinary evidence." value={application.documentsReady} locked />
          <ChecklistRow title="Responsible-breeding pledge" body="I reject animal sales, exploitation, unsafe frequency, and misleading health claims." value={application.acknowledged} onChange={(value) => update({ acknowledged: value })} disabled={!enabled} />
        </View>

        {application.status === 'pending' ? <View style={styles.pending}><Feather name="clock" size={22} color={colors.lilac} /><View><Text style={styles.pendingTitle}>Private review pending</Text><Text style={styles.pendingBody}>Documents are not public. Discovery remains off until a moderator approves every gate.</Text></View></View> : <Button label={enabled ? 'Requires legal and welfare approval' : 'Unavailable in this region'} onPress={submitSafely} disabled={!eligible || !enabled} style={styles.submit} />}

        <View style={styles.flow}><Text style={styles.flowTitle}>How access works</Text>{['Submit private evidence', 'Moderator and welfare review', 'Region and feature flag check', 'Verified discovery—never animal sales'].map((item, index) => <View key={item} style={styles.flowRow}><View style={styles.flowNumber}><Text style={styles.flowNumberText}>{index + 1}</Text></View><Text style={styles.flowText}>{item}</Text>{index < 3 && <View style={styles.flowLine} />}</View>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChecklistRow({ title, body, value, onChange, disabled, locked }: { title: string; body: string; value: boolean; onChange?: (value: boolean) => void; disabled?: boolean; locked?: boolean }) {
  return <View style={[styles.checkRow, disabled && styles.disabled]}><View style={[styles.checkIcon, value && styles.checkIconActive]}><Feather name={value ? 'check' : locked ? 'lock' : 'minus'} size={15} color={value ? colors.white : colors.inkMuted} /></View><View style={styles.checkCopy}><Text style={styles.checkTitle}>{title}</Text><Text style={styles.checkBody}>{body}</Text></View>{onChange && <Toggle value={value} onValueChange={onChange} label={title} disabled={disabled} />}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 16, paddingBottom: 42 },
  hero: { borderRadius: radii.xl, padding: 20, marginTop: 18, minHeight: 250, justifyContent: 'flex-end', overflow: 'hidden' }, heroIcon: { position: 'absolute', top: 18, right: 18, width: 52, height: 52, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' }, heroLabel: { color: colors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, heroTitle: { color: colors.white, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8, maxWidth: 310 }, heroBody: { color: 'rgba(255,255,255,0.72)', fontSize: 11, lineHeight: 17, marginTop: 9, maxWidth: 330 },
  warning: { flexDirection: 'row', gap: 9, backgroundColor: colors.coralSoft, borderRadius: radii.md, padding: 13, marginTop: 14 }, warningText: { flex: 1, color: colors.coralDark, fontSize: 9, lineHeight: 14, fontWeight: '600' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 10 },
  petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 11, borderWidth: 1, borderColor: colors.line }, petImage: { width: 74, height: 74, borderRadius: 20 }, petCopy: { flex: 1, marginLeft: 12 }, petName: { color: colors.ink, fontSize: 17, fontWeight: '800' }, petMeta: { color: colors.inkMuted, fontSize: 10, marginTop: 3 }, badges: { flexDirection: 'row', gap: 5, marginTop: 8 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.greenSoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }, badgeText: { color: colors.green, fontSize: 8, fontWeight: '800' },
  petPlaceholder: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, petEmoji: { fontSize: 26 },
  checklist: { backgroundColor: colors.white, borderRadius: radii.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }, checkRow: { minHeight: 84, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, disabled: { opacity: 0.5 }, checkIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }, checkIconActive: { backgroundColor: colors.green }, checkCopy: { flex: 1, marginHorizontal: 10 }, checkTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, checkBody: { color: colors.inkMuted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  submit: { marginTop: 18 }, pending: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.lilacSoft, borderRadius: radii.lg, padding: 15, marginTop: 18 }, pendingTitle: { color: colors.lilac, fontSize: 12, fontWeight: '800' }, pendingBody: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, marginTop: 3, maxWidth: 290 },
  flow: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, marginTop: 25, borderWidth: 1, borderColor: colors.line }, flowTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 8 }, flowRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center' }, flowNumber: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', zIndex: 2 }, flowNumberText: { color: colors.green, fontSize: 10, fontWeight: '900' }, flowText: { color: colors.ink, fontSize: 10, fontWeight: '700', marginLeft: 10 }, flowLine: { position: 'absolute', left: 13, top: 32, width: 1, height: 20, backgroundColor: colors.mint },
});
