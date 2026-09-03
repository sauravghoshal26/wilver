import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Toggle } from '@/src/components/Toggle';
import { pickSanitizedImage, SanitizedImage } from '@/src/lib/media';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';
import { Pet } from '@/src/types/models';

const sizes: NonNullable<Pet['size']>[] = ['Small', 'Medium', 'Large'];
const sexes: NonNullable<Pet['sex']>[] = ['Female', 'Male', 'Unknown'];

export default function PetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAppStore((state) => state.pets.find((pet) => pet.id === id));
  const savePet = useAppStore((state) => state.savePet);
  const deletePet = useAppStore((state) => state.deletePet);
  const [name, setName] = useState(existing?.name ?? '');
  const [species, setSpecies] = useState<Pet['species']>(existing?.species ?? 'dog');
  const [breed, setBreed] = useState(existing?.breed ?? '');
  const [age, setAge] = useState(existing?.age ?? '');
  const [temperament, setTemperament] = useState(existing?.temperament.join(', ') ?? 'Friendly, Social');
  const [size, setSize] = useState<NonNullable<Pet['size']>>(existing?.size ?? 'Medium');
  const [sex, setSex] = useState<NonNullable<Pet['sex']>>(existing?.sex ?? 'Unknown');
  const [vaccinated, setVaccinated] = useState(existing?.vaccinated ?? false);
  const [fixed, setFixed] = useState(existing?.neuteredOrSpayed ?? false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<SanitizedImage | null>(null);

  const choosePhoto = async () => {
    try {
      const selected = await pickSanitizedImage([1, 1]);
      if (selected) setPhoto(selected);
    } catch (error) {
      Alert.alert('Could not use that photo', error instanceof Error ? error.message : 'Please try another image.');
    }
  };

  const save = async () => {
    if (!name.trim() || !breed.trim() || !age.trim()) return;
    setSaving(true);
    try {
      await savePet({ name: name.trim(), species, breed: breed.trim(), age: age.trim(), temperament: temperament.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5), size, sex, vaccinated, neuteredOrSpayed: fixed }, id, photo);
      router.back();
    } catch (error) {
      Alert.alert('Could not save pet', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const remove = () => existing && Alert.alert(`Remove ${existing.name}'s profile?`, 'This permanently removes the pet profile and its uploaded photos. Existing post text remains, but the pet tag is cleared.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove pet', style: 'destructive', onPress: () => { setSaving(true); void deletePet(existing.id).then(() => router.back()).catch((error) => Alert.alert('Could not remove pet', error instanceof Error ? error.message : 'Please try again.')).finally(() => setSaving(false)); } },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader eyebrow="PET PROFILE" title={existing ? `Edit ${existing.name}` : 'Add a pet'} subtitle="Public traits help make safer, more compatible connections." />
          <Pressable onPress={() => { void choosePhoto(); }} style={styles.photoWrap} accessibilityLabel={existing?.imageUrl || photo ? 'Replace pet photo' : 'Add pet photo'}>{photo || existing?.imageUrl ? <Image source={{ uri: photo?.uri ?? existing?.imageUrl }} style={styles.photo} contentFit="cover" /> : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={styles.photoEmoji}>🐾</Text></View>}<View style={styles.camera}><Feather name="camera" size={17} color={colors.white} /></View></Pressable>
          <Text style={styles.photoHelp}>{photo ? 'Ready to upload · embedded location metadata removed' : 'Optional · images are re-encoded before upload to remove embedded location metadata.'}</Text>

          <Field label="Pet’s name" value={name} onChangeText={setName} placeholder="e.g. Bruno" />
          <Text style={styles.label}>Species</Text><View style={styles.species}>{(['dog', 'cat'] as const).map((item) => <Pressable key={item} onPress={() => setSpecies(item)} style={[styles.speciesButton, species === item && styles.optionActive]}><Text style={styles.speciesEmoji}>{item === 'dog' ? '🐕' : '🐈'}</Text><Text style={[styles.optionText, species === item && styles.optionTextActive]}>{item === 'dog' ? 'Dog' : 'Cat'}</Text></Pressable>)}</View>
          <Field label="Breed or mix" value={breed} onChangeText={setBreed} placeholder="e.g. Labrador mix" />
          <Field label="Age" value={age} onChangeText={setAge} placeholder="e.g. 2 years" />

          <Text style={styles.label}>Size</Text><View style={styles.options}>{sizes.map((item) => <Pressable key={item} onPress={() => setSize(item)} style={[styles.option, size === item && styles.optionActive]}><Text style={[styles.optionText, size === item && styles.optionTextActive]}>{item}</Text></Pressable>)}</View>
          <Text style={styles.label}>Sex</Text><View style={styles.options}>{sexes.map((item) => <Pressable key={item} onPress={() => setSex(item)} style={[styles.option, sex === item && styles.optionActive]}><Text style={[styles.optionText, sex === item && styles.optionTextActive]}>{item}</Text></Pressable>)}</View>
          <Field label="Temperament" value={temperament} onChangeText={setTemperament} placeholder="Friendly, calm, playful" help="Separate up to five traits with commas." />

          <Text style={styles.sectionTitle}>Health signals</Text><View style={styles.healthCard}><HealthRow title="Vaccinations up to date" body="Self-reported by you; this is not a verification badge." value={vaccinated} onChange={setVaccinated} /><View style={styles.divider} /><HealthRow title="Neutered or spayed" body="Optional public compatibility signal." value={fixed} onChange={setFixed} /></View>
          <View style={styles.private}><Feather name="lock" size={16} color={colors.green} /><Text style={styles.privateText}>Private health notes, veterinary contacts, and documents are stored separately and are never part of the public profile.</Text></View>
        </ScrollView>
        <View style={styles.footer}>{existing && <Button label="Remove pet" onPress={remove} variant="ghost" disabled={saving} style={styles.remove} />}<Button label={existing ? 'Save changes' : 'Add pet'} onPress={() => { void save(); }} loading={saving} disabled={!name.trim() || !breed.trim() || !age.trim()} style={styles.save} /></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, help, ...props }: { label: string; help?: string; value: string; onChangeText: (value: string) => void; placeholder: string }) { return <View><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor={colors.inkMuted} style={styles.input} />{help && <Text style={styles.help}>{help}</Text>}</View>; }
function HealthRow({ title, body, value, onChange }: { title: string; body: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.healthRow}><View style={styles.healthCopy}><Text style={styles.healthTitle}>{title}</Text><Text style={styles.healthBody}>{body}</Text></View><Toggle value={value} onValueChange={onChange} label={title} /></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, content: { padding: 16, paddingBottom: 32 },
  photoWrap: { width: 132, height: 132, alignSelf: 'center', marginTop: 23 }, photo: { width: 132, height: 132, borderRadius: 44 }, camera: { position: 'absolute', right: -3, bottom: -3, width: 40, height: 40, borderRadius: 15, backgroundColor: colors.coral, borderWidth: 3, borderColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }, photoHelp: { color: colors.inkMuted, fontSize: 8, textAlign: 'center', marginTop: 9, paddingHorizontal: 30 },
  photoPlaceholder: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, photoEmoji: { fontSize: 36 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 18, marginBottom: 7 }, input: { height: 52, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.ink, fontSize: 13 }, help: { color: colors.inkMuted, fontSize: 8, marginTop: 5 },
  species: { flexDirection: 'row', gap: 10 }, speciesButton: { flex: 1, height: 66, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, speciesEmoji: { fontSize: 22 },
  options: { flexDirection: 'row', gap: 8 }, option: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, optionActive: { backgroundColor: colors.green, borderColor: colors.green }, optionText: { color: colors.inkMuted, fontSize: 10, fontWeight: '800' }, optionTextActive: { color: colors.white },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 26, marginBottom: 10 }, healthCard: { backgroundColor: colors.white, borderRadius: radii.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }, healthRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center' }, healthCopy: { flex: 1 }, healthTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, healthBody: { color: colors.inkMuted, fontSize: 8, marginTop: 3 }, divider: { height: 1, backgroundColor: colors.line },
  private: { flexDirection: 'row', gap: 8, backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 12, marginTop: 12 }, privateText: { flex: 1, color: colors.greenDark, fontSize: 8, lineHeight: 13 },
  footer: { flexDirection: 'row', gap: 8, padding: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  remove: { flex: 0.7 }, save: { flex: 1.3 },
});
