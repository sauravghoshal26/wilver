import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function AlertSightingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alertItem = useAppStore((state) => state.lostFoundAlerts.find((item) => item.id === id));
  const sightings = useAppStore((state) => state.alertSightings.filter((item) => item.alertId === id));
  const report = useAppStore((state) => state.reportAlertSighting);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!alertItem) return <SafeAreaView style={styles.safe}><View style={styles.content}><EmptyState icon="alert-circle" title="Alert unavailable" body="It may have been removed or is no longer visible to your account." /></View></SafeAreaView>;

  const submit = async () => {
    if (description.trim().length < 3) return;
    setSaving(true);
    try {
      await report(alertItem.id, description);
      setDescription('');
      Alert.alert('Sighting sent safely', 'The alert owner can see your description and approximate neighbourhood. Your exact GPS coordinates are never shared.');
    } catch (error) {
      Alert.alert('Could not send sighting', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="PRIVATE COMMUNITY TIP" title={alertItem.createdByCurrentUser ? 'Reported sightings' : 'Share a sighting'} subtitle={alertItem.title} />
          {alertItem.createdByCurrentUser ? <View style={styles.list}>{sightings.length === 0 ? <EmptyState icon="eye" title="No sightings yet" body="Community tips will appear here in real time. Keep contact inside Wilver." /> : sightings.map((sighting) => <View key={sighting.id} style={styles.card}><View style={styles.cardTop}><View style={styles.eye}><Feather name="eye" size={16} color={colors.green} /></View><Text style={styles.area}>{sighting.neighborhood}</Text><Text style={styles.time}>{sighting.createdAt}</Text></View><Text style={styles.description}>{sighting.description}</Text></View>)}</View> : <><View style={styles.notice}><Feather name="shield" size={18} color={colors.green} /><Text style={styles.noticeText}>Describe what you saw and when. Wilver derives only an approximate area from your saved location; do not type a home address, phone number, or private contact details.</Text></View><Text style={styles.label}>What did you see?</Text><TextInput value={description} onChangeText={setDescription} multiline maxLength={1000} style={styles.input} textAlignVertical="top" placeholder="Example: I saw a similar dog near the north entrance around 6:15 PM, heading toward the main road." placeholderTextColor={colors.inkMuted} /><Text style={styles.count}>{description.length}/1000</Text><Button label="Send sighting privately" onPress={() => { void submit(); }} loading={saving} disabled={description.trim().length < 3} /></>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, content: { padding: 16, paddingBottom: 40 },
  notice: { flexDirection: 'row', gap: 9, padding: 13, borderRadius: radii.md, backgroundColor: colors.greenSoft, marginTop: 20 },
  noticeText: { flex: 1, color: colors.greenDark, fontSize: 10, lineHeight: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  input: { minHeight: 170, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 14, color: colors.ink, fontSize: 14, lineHeight: 21 },
  count: { color: colors.inkMuted, fontSize: 9, textAlign: 'right', marginTop: 5, marginBottom: 14 },
  list: { marginTop: 18, gap: 10 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.line },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  eye: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  area: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800', marginLeft: 9 },
  time: { color: colors.inkMuted, fontSize: 9 },
  description: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 11 },
});
