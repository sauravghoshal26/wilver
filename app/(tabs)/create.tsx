import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { Button } from '@/src/components/Button';
import { DateTimeField } from '@/src/components/DateTimeField';
import { Toggle } from '@/src/components/Toggle';
import { pickSanitizedImage, SanitizedImage } from '@/src/lib/media';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

const createTypes = [
  { key: 'post', label: 'Post', icon: 'edit-3' as const },
  { key: 'playdate', label: 'Playdate', icon: 'users' as const },
  { key: 'walk', label: 'Walk', icon: 'map-pin' as const },
  { key: 'lost', label: 'Lost pet', icon: 'alert-circle' as const },
  { key: 'found', label: 'Found pet', icon: 'search' as const },
  { key: 'event', label: 'Event', icon: 'calendar' as const },
];

type CreateType = typeof createTypes[number]['key'];

export default function CreateScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const requestedType = createTypes.some((item) => item.key === params.type) ? params.type as CreateType : 'post';
  const [type, setType] = useState<CreateType>(requestedType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 86_400_000));
  const currentUser = useAppStore((state) => state.currentUser);
  const [location, setLocation] = useState(currentUser?.neighborhood === 'Area not shared' ? '' : currentUser?.neighborhood ?? '');
  const [capacity, setCapacity] = useState('8');
  const [compatiblePets, setCompatiblePets] = useState('Vaccinated, social pets');
  const [meetingInstructions, setMeetingInstructions] = useState('');
  const [urgent, setUrgent] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [photo, setPhoto] = useState<SanitizedImage | null>(null);
  const addPost = useAppStore((state) => state.addPost);
  const addActivity = useAppStore((state) => state.addActivity);
  const addAlert = useAppStore((state) => state.addLostFoundAlert);

  const isActivity = type === 'playdate' || type === 'walk' || type === 'event';
  const isAlert = type === 'lost' || type === 'found';
  const valid = body.trim().length > 0 && (!isActivity && !isAlert || title.trim().length >= 3);

  const publish = async () => {
    if (!valid) return;
    setPublishing(true);
    try {
      if (type === 'post') {
        await addPost(body.trim(), photo);
        router.replace('/(tabs)');
      } else if (isActivity) {
        if (scheduledAt <= new Date()) throw new Error('Choose a future date and time.');
        const activityId = await addActivity({
          title: title.trim(),
          type: type === 'walk' ? 'Walk' : type === 'playdate' ? 'Playdate' : 'Event',
          description: body.trim(),
          startsAt: scheduledAt.toISOString(),
          locationLabel: location.trim(),
          capacity: Math.max(2, Math.min(500, Number(capacity) || 8)),
          compatiblePets: compatiblePets.trim() || 'All friendly pets',
          exactLocationHint: meetingInstructions.trim(),
        });
        router.replace({ pathname: '/activities/[id]', params: { id: activityId } });
      } else {
        await addAlert({
          kind: type === 'lost' ? 'lost' : 'found',
          title: title.trim(),
          description: body.trim(),
          neighborhood: location.trim(),
          lastSeen: scheduledAt.toISOString(),
          urgent: type === 'lost' && urgent,
        }, photo);
        router.replace('/lost-found');
      }
      setBody('');
      setTitle('');
      setPhoto(null);
    } catch (error) {
      Alert.alert('Could not publish', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const choosePhoto = async () => {
    try {
      const selected = await pickSanitizedImage([4, 3]);
      if (selected) setPhoto(selected);
    } catch (error) {
      Alert.alert('Could not use that photo', error instanceof Error ? error.message : 'Please try another image.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><View><Text style={styles.eyebrow}>SHARE WITH CARE</Text><Text style={styles.title}>Create something</Text></View><Pressable onPress={() => router.replace('/(tabs)')} style={styles.close} accessibilityLabel="Close"><Feather name="x" size={21} color={colors.ink} /></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>{createTypes.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: type === item.key }} accessibilityLabel={`Create ${item.label}`} key={item.key} onPress={() => setType(item.key)} style={[styles.type, type === item.key && styles.typeActive]}><Feather name={item.icon} size={17} color={type === item.key ? colors.white : colors.green} /><Text style={[styles.typeText, type === item.key && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
          <View style={styles.card}>
            <View style={styles.identity}><Avatar uri={currentUser?.avatarUrl} size={44} verified={currentUser?.verified} /><View><Text style={styles.name}>{currentUser?.name ?? 'Your profile'}</Text><View style={styles.visibility}><Feather name="users" size={12} color={colors.inkMuted} /><Text style={styles.visibilityText}>Your local circle</Text></View></View></View>
            {(isActivity || isAlert) && <TextInput value={title} onChangeText={setTitle} maxLength={100} placeholder={isActivity ? 'Give your plan a name' : type === 'lost' ? 'e.g. Help find Coco' : 'e.g. Friendly tabby is safe'} placeholderTextColor={colors.inkMuted} style={styles.titleInput} accessibilityLabel="Title" />}
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
              placeholder={type === 'post' ? 'What’s happening with your pet?' : type === 'lost' ? 'Tell the community what happened…' : 'Describe the plan…'}
              placeholderTextColor={colors.inkMuted}
              style={styles.textarea}
              textAlignVertical="top"
              accessibilityLabel="Post content"
            />
            {photo && !isActivity && <View style={styles.previewWrap}><Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" /><Pressable onPress={() => setPhoto(null)} style={styles.removePhoto} accessibilityLabel="Remove selected photo"><Feather name="x" size={17} color={colors.white} /></Pressable><View style={styles.sanitized}><Feather name="shield" size={12} color={colors.green} /><Text style={styles.sanitizedText}>Location metadata removed</Text></View></View>}
            {(isActivity || isAlert) && <View style={styles.details}>
              <DateTimeField value={scheduledAt} onChange={setScheduledAt} minimumDate={isActivity ? new Date() : undefined} label={isAlert ? 'Last seen or found' : 'Date and time'} />
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}><View style={styles.detailIcon}><Feather name="map-pin" size={17} color={colors.green} /></View><View style={styles.detailCopy}><Text style={styles.detailLabel}>APPROXIMATE AREA</Text><TextInput value={location} onChangeText={setLocation} style={styles.detailInput} placeholder="Neighbourhood only" placeholderTextColor={colors.inkMuted} /></View></View>
              {isActivity && <><View style={styles.detailDivider} /><View style={styles.twoDetails}><View style={styles.halfDetail}><Text style={styles.detailLabel}>CAPACITY</Text><TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" style={styles.smallInput} /></View><View style={styles.halfDetail}><Text style={styles.detailLabel}>GOOD FIT FOR</Text><TextInput value={compatiblePets} onChangeText={setCompatiblePets} style={styles.smallInput} /></View></View></>}
              {isActivity && <><View style={styles.detailDivider} /><View style={styles.privateDetail}><View style={styles.privateDetailLabel}><Feather name="lock" size={13} color={colors.green} /><Text style={styles.detailLabel}>PRIVATE MEETING INSTRUCTIONS</Text></View><TextInput value={meetingInstructions} onChangeText={setMeetingInstructions} maxLength={500} style={styles.privateInput} placeholder="Shared only after you approve attendance" placeholderTextColor={colors.inkMuted} /></View></>}
              {isAlert && <View style={styles.urgentRow}><View><Text style={styles.urgentTitle}>Urgent nearby alert</Text><Text style={styles.urgentBody}>Use only when timely community attention may help.</Text></View><Toggle value={type === 'lost' && urgent} onValueChange={setUrgent} label="Urgent alert" /></View>}
            </View>}
            {currentUser?.pets[0] && <View style={styles.petTag}><Image source={{ uri: currentUser.pets[0].imageUrl }} style={styles.petPhoto} /><Text style={styles.petTagText}>With {currentUser.pets[0].name}</Text></View>}
            <View style={styles.divider} />
            <View style={styles.addRow}><Text style={styles.addLabel}>{isActivity ? 'Activity details are shown above' : photo ? 'Photo ready to upload' : 'Add a privacy-safe photo'}</Text><View style={styles.addActions}>{!isActivity && <Pressable onPress={() => { void choosePhoto(); }} style={styles.addButton} accessibilityLabel={photo ? 'Replace photo' : 'Add photo'}><Feather name="image" size={19} color={colors.green} /></Pressable>}{currentUser?.pets[0] && <View style={styles.addButton} accessibilityLabel={`${currentUser.pets[0].name} is tagged`}><Text style={styles.paw}>🐾</Text></View>}</View></View>
          </View>
          <View style={styles.safety}><Feather name="shield" color={colors.green} size={17} /><Text style={styles.safetyText}>{isActivity ? 'Only the approximate area is public. You can share exact meeting instructions after approving an attendee.' : isAlert ? 'Use an approximate last-seen area and in-app chat. Never publish a phone number or home address.' : 'Keep exact home addresses, phone numbers, and sensitive health details private.'}</Text></View>
        </ScrollView>
        <View style={styles.footer}><View style={styles.count}><Text style={styles.countText}>{body.length}/500</Text></View><Button label={type === 'post' ? 'Publish post' : isActivity ? 'Publish activity' : 'Publish alert'} onPress={() => { void publish(); }} loading={publishing} disabled={!valid || (isActivity || isAlert) && !location.trim()} style={styles.publish} /></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  types: { gap: 8, marginTop: 21, marginBottom: 18 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: colors.white, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line },
  typeActive: { backgroundColor: colors.green, borderColor: colors.green },
  typeText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  typeTextActive: { color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  identity: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  visibility: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  visibilityText: { color: colors.inkMuted, fontSize: 10 },
  textarea: { minHeight: 170, color: colors.ink, fontSize: 17, lineHeight: 25, paddingTop: 20 },
  previewWrap: { marginBottom: 14 },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md },
  removePhoto: { position: 'absolute', right: 9, top: 9, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(20,30,28,0.72)', alignItems: 'center', justifyContent: 'center' },
  sanitized: { position: 'absolute', left: 9, bottom: 9, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 6 },
  sanitizedText: { color: colors.greenDark, fontSize: 9, fontWeight: '800' },
  titleInput: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, paddingTop: 21, paddingBottom: 0 },
  details: { backgroundColor: colors.canvas, borderRadius: radii.md, paddingHorizontal: 12, marginBottom: 14 },
  detailRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center' },
  detailIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, marginLeft: 10 },
  detailLabel: { color: colors.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  detailInput: { color: colors.ink, fontSize: 12, fontWeight: '700', paddingVertical: 3 },
  detailDivider: { height: 1, backgroundColor: colors.line, marginLeft: 46 },
  twoDetails: { flexDirection: 'row', gap: 11, paddingVertical: 10 },
  halfDetail: { flex: 1 },
  smallInput: { height: 36, color: colors.ink, fontSize: 11, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: colors.lineStrong },
  privateDetail: { paddingVertical: 11 },
  privateDetailLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateInput: { minHeight: 38, color: colors.ink, fontSize: 11, fontWeight: '700', paddingVertical: 7 },
  urgentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
  urgentTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  urgentBody: { color: colors.inkMuted, fontSize: 8, marginTop: 3, maxWidth: 245 },
  petTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.greenSoft, borderRadius: radii.pill, padding: 5, paddingRight: 9 },
  petPhoto: { width: 26, height: 26, borderRadius: 13 },
  petTagText: { color: colors.greenDark, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 15 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  addActions: { flexDirection: 'row', gap: 8 },
  addButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  paw: { fontSize: 16 },
  safety: { flexDirection: 'row', gap: 9, backgroundColor: colors.greenSoft, borderRadius: radii.md, padding: 13, marginTop: 14 },
  safetyText: { flex: 1, color: colors.greenDark, fontSize: 11, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: Platform.OS === 'ios' ? 8 : 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  count: { flex: 1 },
  countText: { color: colors.inkMuted, fontSize: 11 },
  publish: { minWidth: 165 },
});
