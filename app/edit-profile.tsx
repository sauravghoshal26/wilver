import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function EditProfileScreen() {
  const profile = useAppStore((state) => state.currentUser);
  const update = useAppStore((state) => state.updateProfile);
  const [name, setName] = useState(profile?.name ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood === 'Area not shared' ? '' : profile?.neighborhood ?? '');
  const [saving, setSaving] = useState(false);
  const cleanHandle = handle.replace(/^@/, '');
  const valid = name.trim().length >= 2 && /^[a-z0-9_.]{3,30}$/.test(cleanHandle) && bio.length <= 280;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await update({ name, handle, bio, neighborhood });
      router.back();
    } catch (error) {
      Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="PUBLIC PROFILE" title="Edit profile" subtitle="Only share information you are comfortable showing to your local pet community." />
          <Field label="Display name" value={name} onChangeText={setName} maxLength={60} />
          <Field label="Handle" value={handle} onChangeText={(value) => setHandle(value.toLowerCase().replace(/[^a-z0-9_.@]/g, ''))} maxLength={31} autoCapitalize="none" />
          <Text style={styles.help}>3–30 lowercase letters, numbers, underscores, or dots.</Text>
          <Text style={styles.label}>Bio</Text><TextInput value={bio} onChangeText={setBio} maxLength={280} multiline style={[styles.input, styles.bio]} textAlignVertical="top" placeholder="A little about you and your pets" placeholderTextColor={colors.inkMuted} /><Text style={styles.count}>{bio.length}/280</Text>
          <Field label="Public approximate area" value={neighborhood} onChangeText={setNeighborhood} maxLength={80} />
          <Text style={styles.help}>This is a label only. Update or remove saved GPS separately under Safety & privacy.</Text>
        </ScrollView>
        <View style={styles.footer}><Button label="Save profile" onPress={() => { void save(); }} loading={saving} disabled={!valid} /></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; maxLength: number; autoCapitalize?: 'none' }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={colors.inkMuted} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, content: { padding: 16, paddingBottom: 34 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 19, marginBottom: 7 },
  input: { minHeight: 52, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink, fontSize: 13 },
  bio: { minHeight: 130, paddingTop: 13 },
  help: { color: colors.inkMuted, fontSize: 9, lineHeight: 14, marginTop: 5 },
  count: { color: colors.inkMuted, fontSize: 9, textAlign: 'right', marginTop: 5 },
  footer: { padding: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
});
