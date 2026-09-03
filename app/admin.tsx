import { Feather } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Toggle } from '@/src/components/Toggle';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function AdminScreen() {
  const authorized = useAppStore((state) => state.currentUser?.isAdmin === true);
  const reports = useAppStore((state) => state.reports);
  const moderate = useAppStore((state) => state.moderateReport);
  const breedingEnabled = useAppStore((state) => state.featureFlags.breeding);
  const toggleBreeding = useAppStore((state) => state.toggleBreedingFeature);
  const open = reports.filter((report) => report.status === 'open' || report.status === 'reviewing');

  const decide = async (reportId: string, decision: 'resolved' | 'dismissed') => {
    try { await moderate(reportId, decision); }
    catch (error) { Alert.alert('Moderation failed', error instanceof Error ? error.message : 'Please try again.'); }
  };
  const confirmRemoval = (reportId: string) => Alert.alert('Remove the reported content?', 'This is a server-authorized moderation action. The report and action reason are written to the audit trail in the same database transaction.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove & resolve', style: 'destructive', onPress: () => { void decide(reportId, 'resolved'); } },
  ]);

  if (!authorized) return <SafeAreaView style={styles.safe}><View style={styles.content}><ScreenHeader title="Admin" /><EmptyState icon="lock" title="Administrator access required" body="Authorization is checked by the database—not by the client." /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="PROTECTED OPERATIONS" title="Trust console" subtitle="Authorization verified by Supabase RLS." />
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{open.length}</Text><Text style={styles.statLabel}>Open reports</Text></View><View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>Verification</Text></View><View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>Critical</Text></View></View>

        <Text style={styles.sectionTitle}>Feature controls</Text>
        <View style={styles.flag}><View style={styles.flagIcon}><Feather name="shield" size={19} color={colors.lilac} /></View><View style={styles.flagCopy}><Text style={styles.flagTitle}>Responsible breeding</Text><Text style={styles.flagBody}>Disabled by default. A feature flag never bypasses regional, identity, pet, document, or moderation gates.</Text></View><Toggle value={breedingEnabled} onValueChange={() => { void toggleBreeding().catch((error: unknown) => Alert.alert('Feature update failed', error instanceof Error ? error.message : 'Please try again.')); }} label="Responsible breeding feature" /></View>

        <View style={styles.sectionHead}><Text style={styles.sectionTitleInline}>Moderation queue</Text><View style={styles.queueCount}><Text style={styles.queueCountText}>{open.length}</Text></View></View>
        {open.length === 0 ? <EmptyState icon="check-circle" title="Queue clear" body="No open or reviewing reports remain." /> : open.map((report) => <View key={report.id} style={styles.report}><View style={styles.reportTop}><View style={[styles.severity, report.status === 'reviewing' && styles.reviewing]}><Text style={styles.severityText}>{report.status.toUpperCase()}</Text></View><Text style={styles.reportTime}>{report.createdAt}</Text></View><Text style={styles.reportTarget}>{report.targetType.toUpperCase()} · {report.targetLabel}</Text><Text style={styles.reportReason}>{report.reason}</Text>{report.details && <Text style={styles.reportDetails}>{report.details}</Text>}<View style={styles.actions}><Pressable onPress={() => { void decide(report.id, 'dismissed'); }} style={styles.dismiss}><Text style={styles.dismissText}>Dismiss report</Text></Pressable><Pressable onPress={() => confirmRemoval(report.id)} style={styles.resolve}><Feather name="trash-2" size={14} color={colors.white} /><Text style={styles.resolveText}>Remove & resolve</Text></Pressable></View></View>)}

        <View style={styles.audit}><Feather name="file-text" size={18} color={colors.green} /><View style={styles.auditCopy}><Text style={styles.auditTitle}>Audit trail required</Text><Text style={styles.auditBody}>In production, every moderation mutation must write a reasoned server-authorized audit record in the same trusted workflow.</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 16, paddingBottom: 42 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 19 }, stat: { flex: 1, backgroundColor: colors.ink, borderRadius: radii.md, padding: 13 }, statValue: { color: colors.white, fontSize: 23, fontWeight: '800' }, statLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 8, fontWeight: '700', marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 10 }, flag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.line }, flagIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center' }, flagCopy: { flex: 1, marginHorizontal: 10 }, flagTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, flagBody: { color: colors.inkMuted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 25, marginBottom: 10 }, sectionTitleInline: { color: colors.ink, fontSize: 18, fontWeight: '800' }, queueCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }, queueCountText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  report: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 15, borderWidth: 1, borderColor: colors.line, marginBottom: 10 }, reportTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, severity: { backgroundColor: colors.dangerSoft, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 }, reviewing: { backgroundColor: colors.yellowSoft }, severityText: { color: colors.danger, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }, reportTime: { color: colors.inkMuted, fontSize: 8 }, reportTarget: { color: colors.coralDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 11 }, reportReason: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 5 }, reportDetails: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 5 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }, dismiss: { paddingHorizontal: 12, paddingVertical: 9 }, dismissText: { color: colors.inkMuted, fontSize: 10, fontWeight: '800' }, resolve: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, resolveText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  audit: { flexDirection: 'row', gap: 10, backgroundColor: colors.greenSoft, borderRadius: radii.lg, padding: 14, marginTop: 16 }, auditCopy: { flex: 1 }, auditTitle: { color: colors.greenDark, fontSize: 11, fontWeight: '800' }, auditBody: { color: colors.inkMuted, fontSize: 8, lineHeight: 13, marginTop: 3 },
});
