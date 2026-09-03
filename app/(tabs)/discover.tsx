import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/EmptyState';
import { PageHeader } from '@/src/components/PageHeader';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii, shadows } from '@/src/theme';

const filters = ['All nearby', 'Dogs', 'Cats', 'In my circle'];

export default function DiscoverScreen() {
  const [mode, setMode] = useState<'cards' | 'list'>('cards');
  const [filter, setFilter] = useState('All nearby');
  const [query, setQuery] = useState('');
  const nearbyParents = useAppStore((state) => state.nearbyParents);
  const connectedIds = useAppStore((state) => state.connectedUserIds);
  const requests = useAppStore((state) => state.connectionRequests);
  const pendingIds = requests.map((request) => request.profile.id);
  const blockedIds = useAppStore((state) => state.blockedUserIds);
  const toggleConnection = useAppStore((state) => state.toggleConnection);
  const visible = nearbyParents.filter((parent) => {
    const filterMatches = filter === 'All nearby' || (filter === 'Dogs' && parent.pets.some((pet) => pet.species === 'dog')) || (filter === 'Cats' && parent.pets.some((pet) => pet.species === 'cat')) || (filter === 'In my circle' && connectedIds.includes(parent.id));
    return parent.pets.length > 0 && !blockedIds.includes(parent.id) && filterMatches && `${parent.name} ${parent.neighborhood} ${parent.pets.map((pet) => pet.name).join(' ')}`.toLowerCase().includes(query.toLowerCase());
  });
  const updateConnection = (profileId: string) => {
    const wasConnected = connectedIds.includes(profileId);
    const wasPending = pendingIds.includes(profileId);
    void toggleConnection(profileId)
      .then(() => Alert.alert(wasConnected ? 'Removed from your circle' : wasPending ? 'Connection request cancelled' : 'Connection request sent'))
      .catch((error: unknown) => Alert.alert('Could not update connection', error instanceof Error ? error.message : 'Please try again.'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <PageHeader eyebrow="AROUND YOU" title="Meet your neighbours" />
        <View style={styles.search}><Feather name="search" size={18} color={colors.inkMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search pets, people, places" placeholderTextColor={colors.inkMuted} style={styles.input} accessibilityLabel="Search nearby" /></View>
        <View style={styles.controls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} accessibilityLabel={`Filter: ${item}`} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
          <View style={styles.mode}><Pressable accessibilityRole="button" accessibilityLabel="Show cards" accessibilityState={{ selected: mode === 'cards' }} onPress={() => setMode('cards')} style={[styles.modeButton, mode === 'cards' && styles.modeActive]}><Feather name="grid" size={16} color={mode === 'cards' ? colors.white : colors.green} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Show list" accessibilityState={{ selected: mode === 'list' }} onPress={() => setMode('list')} style={[styles.modeButton, mode === 'list' && styles.modeActive]}><Feather name="list" size={16} color={mode === 'list' ? colors.white : colors.green} /></Pressable></View>
        </View>
        <View style={styles.shortcuts}><Pressable onPress={() => router.push('/activities')} style={styles.shortcut}><Feather name="calendar" size={14} color={colors.green} /><Text style={styles.shortcutText}>Nearby plans</Text></Pressable><Pressable onPress={() => router.push('/lost-found')} style={styles.shortcut}><Feather name="radio" size={14} color={colors.coral} /><Text style={styles.shortcutText}>Lost & found</Text></Pressable><Pressable onPress={() => router.push('/connections')} style={styles.shortcut}><Feather name="user-plus" size={14} color={colors.green} /><Text style={styles.shortcutText}>Requests {requests.filter((request) => request.direction === 'incoming').length || ''}</Text></Pressable></View>
      </View>
      {mode === 'cards' ? (
        <View style={styles.map}>
          {visible.length === 0 ? <View style={styles.emptyOverlay}><EmptyState icon="map-pin" title="No nearby pet parents yet" body="Your precise location stays private. Invite a local pet parent or check again as the community grows." actionLabel="Create an introduction" onAction={() => router.push('/(tabs)/create')} /></View> : <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>{visible.map((parent) => <View key={parent.id} style={styles.discoveryCard}><Image source={{ uri: parent.pets[0]!.imageUrl }} style={styles.discoveryImage} contentFit="cover" /><View style={styles.distanceBadge}><Feather name="navigation" size={11} color={colors.green} /><Text style={styles.distanceBadgeText}>about {parent.distanceKm} km away</Text></View><Text style={styles.previewTitle}>{parent.pets[0]!.name} · {parent.pets[0]!.age}</Text><Text style={styles.previewMeta}>{parent.pets[0]!.breed} · with {parent.name}</Text><Text style={styles.area}>{parent.neighborhood} · approximate area</Text><View style={styles.temperaments}>{parent.pets[0]!.temperament.slice(0, 3).map((trait) => <Text key={trait} style={styles.trait}>{trait}</Text>)}</View><Pressable onPress={() => updateConnection(parent.id)} style={[styles.cardAction, connectedIds.includes(parent.id) && styles.cardActionConnected, pendingIds.includes(parent.id) && styles.cardActionPending]}><Feather name={connectedIds.includes(parent.id) ? 'check' : pendingIds.includes(parent.id) ? 'clock' : 'user-plus'} size={17} color={connectedIds.includes(parent.id) ? colors.white : colors.green} /><Text style={[styles.cardActionText, connectedIds.includes(parent.id) && styles.cardActionTextConnected]}>{connectedIds.includes(parent.id) ? 'In your circle' : pendingIds.includes(parent.id) ? 'Request pending' : 'Request connection'}</Text></Pressable></View>)}</ScrollView>}
          <View style={styles.mapNotice}><Feather name="shield" size={14} color={colors.green} /><Text style={styles.mapNoticeText}>GPS is used privately for distance matching—never exact pins</Text></View>
        </View>
      ) : (
        <FlatList data={visible} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} ListEmptyComponent={<EmptyState icon="compass" title="No nearby profiles" body="Try a wider filter later, or verify location access in Safety & privacy." />} renderItem={({ item }) => <View style={styles.personCard}><Image source={{ uri: item.pets[0]!.imageUrl }} style={styles.petImage} contentFit="cover" /><View style={styles.personCopy}><Text style={styles.petName}>{item.pets[0]!.name} <Text style={styles.petAge}>· {item.pets[0]!.age}</Text></Text><Text style={styles.parentName}>with {item.name} · about {item.distanceKm} km</Text><Text style={styles.breed}>{item.pets[0]!.breed} · {item.neighborhood}</Text></View><Pressable onPress={() => updateConnection(item.id)} style={[styles.connect, connectedIds.includes(item.id) && styles.connectActive]} accessibilityLabel={connectedIds.includes(item.id) ? 'Remove from circle' : pendingIds.includes(item.id) ? 'Cancel pending request' : 'Request connection'}><Feather name={connectedIds.includes(item.id) ? 'check' : pendingIds.includes(item.id) ? 'clock' : 'plus'} size={18} color={connectedIds.includes(item.id) ? colors.white : colors.green} /></Pressable></View>} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  headerWrap: { padding: 16, paddingBottom: 12, backgroundColor: colors.canvas },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, marginTop: 15 },
  input: { flex: 1, color: colors.ink, fontSize: 14, height: '100%' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.white },
  shortcutText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  filters: { gap: 8 },
  filter: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.white },
  mode: { flexDirection: 'row', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 13, padding: 2 },
  modeButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  modeActive: { backgroundColor: colors.green },
  map: { flex: 1, backgroundColor: colors.cream, overflow: 'hidden', paddingTop: 54 },
  emptyOverlay: { marginHorizontal: 20, marginTop: 16 },
  cardRail: { paddingHorizontal: 18, paddingBottom: 20, gap: 14, alignItems: 'center' },
  discoveryCard: { width: 300, backgroundColor: colors.white, borderRadius: radii.lg, padding: 13, ...shadows.card },
  discoveryImage: { width: '100%', height: 230, borderRadius: radii.md, backgroundColor: colors.greenSoft },
  distanceBadge: { position: 'absolute', top: 23, left: 23, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: radii.pill },
  distanceBadgeText: { color: colors.greenDark, fontSize: 9, fontWeight: '800' },
  area: { color: colors.inkMuted, fontSize: 10, marginTop: 4 },
  cardAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, borderRadius: radii.md, backgroundColor: colors.greenSoft, marginTop: 14 },
  cardActionConnected: { backgroundColor: colors.green },
  cardActionPending: { backgroundColor: colors.yellowSoft },
  cardActionText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  cardActionTextConnected: { color: colors.white },
  road: { position: 'absolute', backgroundColor: '#F9F8F2', borderColor: '#D5D0C4', borderWidth: 1 },
  roadOne: { width: '140%', height: 30, top: '28%', left: '-20%', transform: [{ rotate: '-13deg' }] },
  roadTwo: { width: 32, height: '130%', top: '-12%', left: '44%', transform: [{ rotate: '20deg' }] },
  roadThree: { width: '120%', height: 24, top: '67%', left: '-10%', transform: [{ rotate: '9deg' }] },
  park: { position: 'absolute', width: 128, height: 105, top: '36%', left: '26%', backgroundColor: '#C9DDBE', borderRadius: 48, transform: [{ rotate: '-10deg' }], alignItems: 'center', justifyContent: 'center' },
  parkText: { color: '#75916E', fontSize: 10, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  pin: { position: 'absolute', width: 58, height: 65, borderRadius: 26, backgroundColor: colors.white, padding: 5, ...shadows.card },
  pinSelected: { borderWidth: 3, borderColor: colors.coral, padding: 2 },
  distance: { position: 'absolute', bottom: -8, alignSelf: 'center', backgroundColor: colors.green, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  distanceText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  you: { position: 'absolute', top: '57%', left: '45%', alignItems: 'center' },
  youDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.white, zIndex: 2 },
  youPulse: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(110,159,208,0.22)', top: -12 },
  youLabel: { marginTop: 4, color: colors.ink, fontSize: 9, fontWeight: '800', backgroundColor: colors.white, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  mapNotice: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: radii.pill },
  mapNoticeText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' },
  preview: { position: 'absolute', bottom: 14, left: 14, right: 14, backgroundColor: colors.white, borderRadius: radii.lg, padding: 10, flexDirection: 'row', alignItems: 'center', ...shadows.card },
  previewImage: { width: 72, height: 72, borderRadius: radii.md },
  previewCopy: { flex: 1, marginLeft: 11 },
  previewTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  previewMeta: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  temperaments: { flexDirection: 'row', gap: 5, marginTop: 7 },
  trait: { color: colors.greenDark, backgroundColor: colors.greenSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, fontSize: 9, fontWeight: '700' },
  heart: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  heartActive: { backgroundColor: colors.coral },
  list: { padding: 16, paddingTop: 4, paddingBottom: 30 },
  personCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: 11, borderWidth: 1, borderColor: colors.line },
  petImage: { width: 76, height: 76, borderRadius: radii.md },
  personCopy: { flex: 1, marginLeft: 12 },
  petName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  petAge: { fontWeight: '500', color: colors.inkMuted },
  parentName: { color: colors.ink, fontSize: 11, marginTop: 4 },
  breed: { color: colors.inkMuted, fontSize: 10, marginTop: 4 },
  connect: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  connectActive: { backgroundColor: colors.green },
});
