import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Logo } from '@/src/components/Logo';
import { Toggle } from '@/src/components/Toggle';
import { createUuid } from '@/src/lib/id';
import { pickSanitizedImage, SanitizedImage } from '@/src/lib/media';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

const interests = ['Walk buddies', 'Playdates', 'Pet-friendly places', 'Training tips', 'Events', 'Rescue community'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(['Walk buddies', 'Playdates']);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [petName, setPetName] = useState('');
  const [petId] = useState(createUuid);
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [agreementsAccepted, setAgreementsAccepted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<SanitizedImage | null>(null);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const openLegal = (document: 'terms' | 'privacy' | 'guidelines') => router.push({ pathname: '/legal/[document]', params: { document } });

  const next = async () => {
    if (step < 2) return setStep(step + 1);
    setSubmitting(true);
    try {
      const photoWarning = await finishOnboarding({
        petId, displayName: displayName.trim(), handle: handle.trim(), interests: selected,
        adultConfirmed, neighborhood: neighborhood.trim(), city: city.trim(), countryCode: countryCode.trim().toUpperCase(),
        latitude: coordinates?.latitude, longitude: coordinates?.longitude, petName: petName.trim(), species,
      }, photo);
      if (photoWarning) Alert.alert('Setup complete', `Your profile is ready, but the optional pet photo was not uploaded. You can add it later from the pet profile.\n\n${photoWarning}`);
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not finish setup', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const choosePhoto = async () => {
    try {
      const selectedPhoto = await pickSanitizedImage([1, 1]);
      if (selectedPhoto) setPhoto(selectedPhoto);
    } catch (error) {
      Alert.alert('Could not use that photo', error instanceof Error ? error.message : 'Please try another image.');
    }
  };

  const requestLocation = async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(result.status === 'granted');
    if (result.status !== 'granted') {
      Alert.alert('That’s okay', 'Enter a city and neighbourhood manually. Nearby distance results will activate after you choose to share device location.');
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      if (place) {
        setNeighborhood(place.district || place.subregion || place.name || '');
        setCity(place.city || place.region || '');
        setCountryCode(place.isoCountryCode || 'IN');
      }
    } catch {
      Alert.alert('Location unavailable', 'Enter your city and neighbourhood manually. You can retry GPS later in privacy settings.');
    }
  };

  const normalizedHandle = handle.replace(/^@/, '');
  const identityValid = displayName.trim().length >= 2 && /^[a-z0-9_.]{3,30}$/i.test(normalizedHandle) && neighborhood.trim().length >= 2 && city.trim().length >= 2;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}><Logo compact /><View style={styles.progress}>{[0, 1, 2].map((item) => <View key={item} style={[styles.progressSegment, item <= step && styles.progressActive]} />)}</View><Text style={styles.step}>{step + 1}/3</Text></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <View style={styles.illustration}><View style={styles.pin}><Feather name="map-pin" size={34} color={colors.white} /></View><View style={[styles.ring, styles.ringOne]} /><View style={[styles.ring, styles.ringTwo]} /><Text style={styles.mapLabel}>Your neighbourhood,{`\n`}not your address</Text></View>
            <Text style={styles.title}>Meet your neighbourhood.</Text>
            <Text style={styles.subtitle}>We only use an approximate area to show nearby pets and activities. Your exact home location is never public.</Text>
            <Text style={styles.label}>Your name</Text>
            <TextInput value={displayName} onChangeText={setDisplayName} maxLength={60} placeholder="How your community will know you" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Display name" />
            <Text style={styles.label}>Handle</Text>
            <TextInput value={handle} onChangeText={(value) => setHandle(value.toLowerCase().replace(/[^a-z0-9_.@]/g, ''))} autoCapitalize="none" maxLength={31} placeholder="@yourhandle" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Profile handle" />
            <Pressable onPress={requestLocation} style={styles.locationCard}><View style={styles.locationIcon}><Feather name="navigation" size={20} color={colors.green} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{locationGranted ? 'Location added privately' : 'Use my current location'}</Text><Text style={styles.locationSub}>{locationGranted ? 'Other members only see your approximate area' : 'Optional · only while you use the app'}</Text></View><Feather name={locationGranted ? 'check-circle' : 'chevron-right'} size={20} color={colors.green} /></Pressable>
            <View style={styles.areaRow}><View style={styles.areaField}><Text style={styles.label}>Neighbourhood</Text><TextInput value={neighborhood} onChangeText={setNeighborhood} maxLength={80} placeholder="Your area" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Neighbourhood" /></View><View style={styles.areaField}><Text style={styles.label}>City</Text><TextInput value={city} onChangeText={setCity} maxLength={80} placeholder="Your city" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="City" /></View></View>
            <View style={styles.consents}><View style={styles.consentRow}><View style={styles.consentCopy}><Text style={styles.consentTitle}>I confirm I’m 18 or older</Text><Text style={styles.consentBody}>Wilver is an adult community.</Text></View><Toggle value={adultConfirmed} onValueChange={setAdultConfirmed} label="Confirm age 18 or older" /></View><View style={styles.consentLine} /><View style={styles.consentRow}><View style={styles.consentCopy}><Text style={styles.consentTitle}>I agree to the terms, privacy notice & community rules</Text><Text style={styles.consentBody}>Including approximate location and animal-welfare commitments.</Text></View><Toggle value={agreementsAccepted} onValueChange={setAgreementsAccepted} label="Accept terms, privacy notice and community rules" /></View><View style={styles.legalLinks}><Pressable onPress={() => openLegal('terms')}><Text style={styles.legalLink}>Terms</Text></Pressable><Text style={styles.legalDot}>·</Text><Pressable onPress={() => openLegal('privacy')}><Text style={styles.legalLink}>Privacy</Text></Pressable><Text style={styles.legalDot}>·</Text><Pressable onPress={() => openLegal('guidelines')}><Text style={styles.legalLink}>Guidelines</Text></Pressable></View></View>
          </View>
        )}
        {step === 1 && (
          <View>
            <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
            <Text style={styles.title}>What brings you here?</Text>
            <Text style={styles.subtitle}>Choose a few interests. We’ll shape your feed and discovery around them.</Text>
            <View style={styles.chips}>{interests.map((interest) => { const active = selected.includes(interest); return <Pressable key={interest} onPress={() => setSelected(active ? selected.filter((item) => item !== interest) : [...selected, interest])} style={[styles.chip, active && styles.chipActive]}><Feather name={active ? 'check' : 'plus'} size={16} color={active ? colors.white : colors.green} /><Text style={[styles.chipText, active && styles.chipTextActive]}>{interest}</Text></Pressable>; })}</View>
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={styles.eyebrow}>MEET YOUR PET</Text>
            <Text style={styles.title}>Who’s joining the circle?</Text>
            <Text style={styles.subtitle}>Start with the basics. You can add health, temperament, and verification details later.</Text>
            <Pressable onPress={() => { void choosePhoto(); }} style={styles.petPhoto} accessibilityLabel={photo ? 'Replace pet photo' : 'Add pet photo'}>{photo ? <Image source={{ uri: photo.uri }} style={styles.petPhotoImage} contentFit="cover" /> : <><Feather name="camera" size={25} color={colors.green} /><Text style={styles.addPhoto}>Add a photo</Text></>}<View style={styles.photoBadge}><Feather name={photo ? 'edit-2' : 'plus'} size={14} color={colors.white} /></View></Pressable>
            <Text style={styles.photoHelp}>{photo ? 'Ready to upload · embedded location metadata removed' : 'Optional · your image is re-encoded to remove embedded location metadata.'}</Text>
            <Text style={styles.label}>Pet’s name</Text>
            <TextInput value={petName} onChangeText={setPetName} placeholder="e.g. Bruno" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Pet name" />
            <Text style={styles.label}>Species</Text>
            <View style={styles.speciesRow}><Pressable onPress={() => setSpecies('dog')} style={[styles.species, species === 'dog' && styles.speciesActive]}><Text style={styles.speciesEmoji}>🐕</Text><Text style={species === 'dog' ? styles.speciesTextActive : styles.speciesText}>Dog</Text></Pressable><Pressable onPress={() => setSpecies('cat')} style={[styles.species, species === 'cat' && styles.speciesActive]}><Text style={styles.speciesEmoji}>🐈</Text><Text style={species === 'cat' ? styles.speciesTextActive : styles.speciesText}>Cat</Text></Pressable></View>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}><Button label={step === 2 ? 'Enter Wilver' : 'Continue'} onPress={() => { void next(); }} loading={submitting} disabled={(step === 0 && (!adultConfirmed || !agreementsAccepted || !identityValid)) || (step === 1 && selected.length === 0) || (step === 2 && !petName.trim())} /><Text style={styles.safety}>Your exact home location and private pet-health notes are never public.</Text></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  top: { height: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 16 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 3, backgroundColor: colors.line },
  progressActive: { backgroundColor: colors.coral },
  step: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32 },
  illustration: { height: 220, backgroundColor: colors.greenSoft, borderRadius: radii.lg, marginBottom: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pin: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(35,107,91,0.2)', borderRadius: 999 },
  ringOne: { width: 140, height: 140 },
  ringTwo: { width: 220, height: 220 },
  mapLabel: { position: 'absolute', bottom: 15, color: colors.greenDark, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  eyebrow: { color: colors.coral, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1.1 },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 23, marginTop: 12 },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 15, borderRadius: radii.md, marginTop: 16, borderWidth: 1, borderColor: colors.line },
  locationIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  locationCopy: { flex: 1, marginLeft: 12 },
  locationTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  locationSub: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  consents: { backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, marginTop: 12 },
  consentRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center' },
  consentCopy: { flex: 1, marginRight: 10 },
  consentTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  consentBody: { color: colors.inkMuted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  consentLine: { height: 1, backgroundColor: colors.line },
  legalLinks: { flexDirection: 'row', gap: 8, paddingBottom: 13, alignItems: 'center' },
  legalLink: { color: colors.green, fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  legalDot: { color: colors.inkSoft, fontSize: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 30 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingVertical: 13, paddingHorizontal: 15 },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  petPhoto: { width: 132, height: 132, alignSelf: 'center', borderRadius: 66, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.green, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginVertical: 28 },
  petPhotoImage: { width: 128, height: 128, borderRadius: 64 },
  photoBadge: { position: 'absolute', right: -2, bottom: 5, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coral, borderWidth: 3, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  photoHelp: { color: colors.inkMuted, fontSize: 9, textAlign: 'center', marginTop: -18, marginBottom: 12, paddingHorizontal: 28 },
  addPhoto: { color: colors.green, fontSize: 12, fontWeight: '800', marginTop: 7 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 13 },
  input: { height: 54, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, color: colors.ink, fontSize: 15 },
  areaRow: { flexDirection: 'row', gap: 10 },
  areaField: { flex: 1 },
  speciesRow: { flexDirection: 'row', gap: 12 },
  species: { flex: 1, height: 72, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  speciesActive: { backgroundColor: colors.green, borderColor: colors.green },
  speciesEmoji: { fontSize: 24 },
  speciesText: { color: colors.ink, fontWeight: '800' },
  speciesTextActive: { color: colors.white, fontWeight: '800' },
  footer: { padding: 22, paddingTop: 10, backgroundColor: colors.cream },
  safety: { color: colors.inkMuted, fontSize: 10, textAlign: 'center', marginTop: 10 },
});
