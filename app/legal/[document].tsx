import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { brand } from '@/src/config/brand';
import { publicEnvironment } from '@/src/config/environment';
import { colors, radii } from '@/src/theme';

type LegalDocument = 'terms' | 'privacy' | 'guidelines';

const documents: Record<LegalDocument, { eyebrow: string; title: string; version: string; intro: string; sections: { title: string; body: string }[] }> = {
  terms: {
    eyebrow: 'TERMS OF USE', title: 'A safe circle starts with clear expectations.', version: publicEnvironment.termsVersion,
    intro: 'These terms describe the rules for using Wilver and the commitments that help keep the community safe.',
    sections: [
      { title: 'Eligibility and accounts', body: 'You must be at least 18, provide accurate account information, protect your credentials, and use one account only for lawful community participation.' },
      { title: 'Community content', body: 'You keep ownership of content you submit and give Wilver the limited permission needed to store, display, moderate, and deliver it through the service. Do not post content you lack rights to share.' },
      { title: 'Animal welfare and safety', body: 'Animal sales, abuse, dangerous conduct, scams, harassment, doxxing, and misleading health or verification claims are prohibited. Breeding discovery remains unavailable unless separately reviewed and approved.' },
      { title: 'Meetups and advice', body: 'You are responsible for evaluating people, pets, places, and activities before meeting. Wilver is not an emergency, veterinary, animal-control, legal, or identity-verification service.' },
      { title: 'Moderation and account action', body: 'We may remove content, limit features, suspend accounts, preserve safety evidence, or comply with lawful requests. Users may report content and request review through the support channel.' },
      { title: 'Deletion and changes', body: 'You can delete your account in the app. Some records may be retained only where legally required or needed for fraud, safety, or dispute handling under the published retention policy.' },
    ],
  },
  privacy: {
    eyebrow: 'PRIVACY NOTICE', title: 'Precise location stays private.', version: publicEnvironment.privacyVersion,
    intro: 'This notice explains the information Wilver processes and the controls available to members.',
    sections: [
      { title: 'Information we collect', body: 'Account and profile details, pet details, community content, messages, reports, device push tokens, consent records, and—only after permission—device location.' },
      { title: 'How location works', body: 'Exact device coordinates are stored in a protected location record and used server-side to calculate nearby results. Other members receive an area label and rounded distance, never your exact point or home address.' },
      { title: 'Why we process data', body: 'To authenticate accounts, deliver community features, show relevant nearby results, prevent abuse, moderate reports, send chosen notifications, maintain security, and meet legal obligations.' },
      { title: 'Sharing and processors', body: 'Wilver uses contracted infrastructure and delivery providers such as Supabase and Expo. We do not expose private messages or exact location to other members except approved activity meeting details under access controls.' },
      { title: 'Retention and deletion', body: 'Account-owned records and media are removed through the in-app deletion workflow. Backups, moderation evidence, and legally required records follow the published retention schedule.' },
      { title: 'Your choices', body: 'You can disable discovery, nearby alerts, push notifications, messaging from others, or saved GPS location; block members; edit profile data; and delete your account from Safety & privacy.' },
    ],
  },
  guidelines: {
    eyebrow: 'COMMUNITY GUIDELINES', title: 'Kind to people. Safe for animals.', version: 'community-draft-2026-08',
    intro: 'These rules apply to profiles, posts, messages, alerts, meetups, and every other community interaction.',
    sections: [
      { title: 'Protect people and locations', body: 'Never publish a home address, phone number, private health record, identity document, or another person’s precise location. Use in-app contact and public meeting places.' },
      { title: 'Put animal welfare first', body: 'No abuse, neglect, unsafe handling, fraudulent health claims, animal sales, paid placement, or pressure to breed. Urgent danger belongs with local emergency or animal-welfare services.' },
      { title: 'Be real and respectful', body: 'No impersonation, harassment, hate, threats, stalking, sexual content, scams, spam, or manipulation. Respect a “no,” a declined request, and a block.' },
      { title: 'Share responsibly', body: 'Post only content you can legally share. Mark lost/found updates accurately, resolve stale alerts, and distinguish personal experience from professional veterinary advice.' },
      { title: 'Report—do not escalate', body: 'Use report and block tools when something feels unsafe. Do not retaliate, expose reporters, or organize harassment. Contact local services when there is immediate danger.' },
    ],
  },
};

export default function LegalScreen() {
  const params = useLocalSearchParams<{ document?: string }>();
  const key: LegalDocument = params.document === 'terms' || params.document === 'privacy' || params.document === 'guidelines' ? params.document : 'guidelines';
  const document = documents[key];
  const draft = document.version.includes('draft');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button label="Back" onPress={() => router.back()} variant="ghost" style={styles.back} />
        <Text style={styles.eyebrow}>{document.eyebrow}</Text>
        <Text style={styles.title}>{document.title}</Text>
        <View style={[styles.version, draft && styles.versionDraft]}><Feather name={draft ? 'clock' : 'check-circle'} size={14} color={draft ? colors.coralDark : colors.green} /><Text style={[styles.versionText, draft && styles.versionTextDraft]}>{draft ? 'Preview policy' : document.version}</Text></View>
        <Text style={styles.intro}>{document.intro}</Text>
        {document.sections.map((section) => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.body}>{section.body}</Text></View>)}
        <View style={styles.contact}><Feather name="mail" size={17} color={colors.green} /><Text style={styles.contactText}>Questions, safety concerns, or privacy requests: {brand.supportEmail}</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 20, paddingBottom: 44, maxWidth: 720, width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', minWidth: 90, marginBottom: 22 }, eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1, marginTop: 7 },
  version: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.greenSoft, marginTop: 15 },
  versionDraft: { backgroundColor: colors.yellowSoft }, versionText: { color: colors.greenDark, fontSize: 9, fontWeight: '800' }, versionTextDraft: { color: colors.coralDark },
  intro: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 17, marginBottom: 8 },
  section: { backgroundColor: colors.white, padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, marginTop: 10 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 6 }, body: { color: colors.inkMuted, fontSize: 11, lineHeight: 18 },
  contact: { flexDirection: 'row', gap: 10, padding: 15, borderRadius: radii.lg, backgroundColor: colors.greenSoft, marginTop: 18 }, contactText: { flex: 1, color: colors.greenDark, fontSize: 10, lineHeight: 16 },
});
