import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { publicEnvironment } from '@/src/config/environment';
import { supabase } from '@/src/lib/supabase';
import { pickSanitizedImage } from '@/src/lib/media';
import { disablePushNotificationsForThisDevice } from '@/src/lib/pushNotifications';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients, radii, shadows } from '@/src/theme';

const baseMenu = [
  { icon: 'shield' as const, label: 'Safety & privacy', detail: 'Location, blocking, discoverability', route: '/safety' },
  { icon: 'bell' as const, label: 'Notifications', detail: 'Messages, events, nearby alerts', route: '/notifications' },
  { icon: 'heart' as const, label: 'Responsible breeding', detail: 'Controlled, disabled-by-default access', route: '/breeding' },
  { icon: 'help-circle' as const, label: 'Community guidelines', detail: 'Keeping every pet parent safe', route: '/legal/guidelines' },
];

export default function ProfileScreen() {
  const setSession = useAppStore((state) => state.setSession);
  const currentUser = useAppStore((state) => state.currentUser);
  const pets = useAppStore((state) => state.pets);
  const connected = useAppStore((state) => state.connectedUserIds.length);
  const activities = useAppStore((state) => state.activities);
  const joined = useAppStore((state) => state.joinedActivities);
  const alerts = useAppStore((state) => state.lostFoundAlerts);
  const updateAvatar = useAppStore((state) => state.updateAvatar);
  const changeAvatar = async () => {
    try {
      const image = await pickSanitizedImage([1, 1]);
      if (image) await updateAvatar(image);
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const menu = currentUser?.isAdmin ? [...baseMenu, { icon: 'lock' as const, label: 'Trust console', detail: 'Server-authorized moderation and flags', route: '/admin' }] : baseMenu;
  const logout = async () => {
    await disablePushNotificationsForThisDevice().catch(() => undefined);
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    router.replace('/(auth)/welcome');
  };
  if (!currentUser) return <SafeAreaView style={styles.safe}><View style={styles.content}><EmptyState icon="user" title="Profile unavailable" body="We could not load your profile. Check your connection and try again." /></View></SafeAreaView>;
  const hosted = activities.filter((activity) => activity.hostedByCurrentUser).length;
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}><Text style={styles.pageTitle}>Profile</Text><Pressable onPress={() => router.push('/safety')} style={styles.settings} accessibilityLabel="Settings"><Feather name="settings" size={20} color={colors.ink} /></Pressable></View>
        <View style={styles.identity}>
          <Pressable onPress={() => { void changeAvatar(); }} accessibilityLabel="Change profile photo" style={styles.avatarButton}><Avatar uri={currentUser.avatarUrl} size={84} verified={currentUser.verified} /><View style={styles.avatarEdit}><Feather name="camera" size={13} color={colors.white} /></View></Pressable>
          <View style={styles.identityCopy}><View style={styles.verifiedRow}><Text style={styles.name}>{currentUser.name}</Text>{currentUser.verified && <Feather name="check-circle" size={17} color={colors.green} />}</View><Text style={styles.handle}>{currentUser.handle}</Text><View style={styles.place}><Feather name="map-pin" size={12} color={colors.inkMuted} /><Text style={styles.placeText}>{currentUser.neighborhood} · approximate</Text></View></View>
        </View>
        <Text style={styles.bio}>{currentUser.bio}</Text>
        <Pressable onPress={() => router.push('/edit-profile')} style={styles.editProfile}><Feather name="edit-2" size={14} color={colors.green} /><Text style={styles.editProfileText}>Edit public profile</Text></Pressable>
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{connected}</Text><Text style={styles.statLabel}>Circle</Text></View><View style={styles.statLine} /><View style={styles.stat}><Text style={styles.statValue}>{hosted + joined.length}</Text><Text style={styles.statLabel}>Plans</Text></View><View style={styles.statLine} /><View style={styles.stat}><Text style={styles.statValue}>{pets.length}</Text><Text style={styles.statLabel}>Pets</Text></View></View>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.trustCard}><View style={styles.trustIcon}><Feather name="shield" size={20} color={colors.white} /></View><View style={styles.trustCopy}><Text style={styles.trustLabel}>{currentUser.verified ? 'VERIFIED COMMUNITY MEMBER' : 'VERIFICATION STATUS'}</Text><Text style={styles.trustTitle}>{currentUser.verified ? 'Profile verified' : 'Verification not completed'}</Text><Text style={styles.trustBody}>Precise location stays private</Text></View><Feather name={currentUser.verified ? 'check-circle' : 'clock'} size={22} color={colors.mint} /></LinearGradient>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>My pets</Text><Pressable onPress={() => router.push('/pet-form')} style={styles.addPet}><Feather name="plus" size={15} color={colors.green} /><Text style={styles.addPetText}>Add pet</Text></Pressable></View>
        {pets.map((pet) => <View key={pet.id} style={styles.petCard}>
          {pet.imageUrl ? <Image source={{ uri: pet.imageUrl }} style={styles.petImage} contentFit="cover" /> : <View style={[styles.petImage, styles.petPlaceholder]}><Text style={styles.petPlaceholderText}>🐾</Text></View>}
          <View style={styles.petCopy}><View style={styles.petTitleRow}><Text style={styles.petName}>{pet.name}</Text>{pet.verified && <View style={styles.verifiedPet}><Feather name="shield" size={11} color={colors.green} /><Text style={styles.verifiedPetText}>Verified</Text></View>}</View><Text style={styles.petMeta}>{pet.breed} · {pet.age}</Text><View style={styles.traits}>{pet.temperament.slice(0, 2).map((trait) => <Text key={trait} style={styles.trait}>{trait}</Text>)}</View><View style={styles.health}><Feather name={pet.vaccinated ? 'check-circle' : 'clock'} size={13} color={pet.vaccinated ? colors.green : colors.coral} /><Text style={[styles.healthText, !pet.vaccinated && { color: colors.coralDark }]}>{pet.vaccinated ? 'Owner reports vaccines current' : 'Vaccination status not shared'}</Text></View></View>
          <Pressable onPress={() => router.push({ pathname: '/pet-form', params: { id: pet.id } })} style={styles.editPet} accessibilityLabel={`Edit ${pet.name}`}><Feather name="edit-2" size={16} color={colors.ink} /></Pressable>
        </View>)}
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your Wilver</Text></View>
        <View style={styles.quick}><Pressable onPress={() => router.push('/activities')} style={[styles.quickCard, { backgroundColor: colors.greenSoft }]}><View style={styles.quickIcon}><Feather name="calendar" size={20} color={colors.green} /></View><Text style={styles.quickTitle}>My plans</Text><Text style={styles.quickMeta}>Hosting {hosted} · joined {joined.length}</Text></Pressable><Pressable onPress={() => router.push('/lost-found')} style={[styles.quickCard, { backgroundColor: colors.coralSoft }]}><View style={[styles.quickIcon, { backgroundColor: colors.white }]}><Feather name="radio" size={20} color={colors.coral} /></View><Text style={styles.quickTitle}>Lost & found</Text><Text style={styles.quickMeta}>{activeAlerts} active</Text></Pressable></View>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Account</Text></View>
        <View style={styles.menu}>{menu.map((item, index) => <Pressable onPress={() => router.push(item.route as Href)} key={item.label} style={[styles.menuRow, index !== menu.length - 1 && styles.menuBorder]}><View style={styles.menuIcon}><Feather name={item.icon} size={18} color={colors.green} /></View><View style={styles.menuCopy}><Text style={styles.menuLabel}>{item.label}</Text><Text style={styles.menuDetail}>{item.detail}</Text></View><Feather name="chevron-right" size={18} color={colors.inkMuted} /></Pressable>)}</View>
        <Pressable onPress={logout} style={styles.logout}><Feather name="log-out" size={17} color={colors.danger} /><Text style={styles.logoutText}>Log out</Text></Pressable>
        <Text style={styles.version}>Wilver · {publicEnvironment.environment === 'production' ? 'Version' : 'Customer preview'} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 18, paddingBottom: 36 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.9 },
  settings: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 25 },
  avatarButton: { width: 88, height: 88 },
  avatarEdit: { position: 'absolute', right: 0, bottom: 0, width: 29, height: 29, borderRadius: 12, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, marginLeft: 15 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  handle: { color: colors.green, fontSize: 12, fontWeight: '700', marginTop: 3 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  placeText: { color: colors.inkMuted, fontSize: 10 },
  bio: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 17 },
  editProfile: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.greenSoft, borderRadius: radii.pill },
  editProfileText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.white, borderRadius: radii.lg, paddingVertical: 16, marginTop: 19, borderWidth: 1, borderColor: colors.line },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.inkMuted, fontSize: 10, marginTop: 3 },
  statLine: { width: 1, height: 28, backgroundColor: colors.line },
  trustCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg, padding: 14, marginTop: 13 },
  trustIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  trustCopy: { flex: 1, marginLeft: 10 },
  trustLabel: { color: colors.mint, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  trustTitle: { color: colors.white, fontSize: 12, fontWeight: '800', marginTop: 2 },
  trustBody: { color: 'rgba(255,255,255,0.65)', fontSize: 8, marginTop: 3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  addPet: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPetText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  petCard: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radii.lg, padding: 11, marginBottom: 10, ...shadows.card },
  petImage: { width: 92, height: 108, borderRadius: radii.md },
  petPlaceholder: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  petPlaceholderText: { fontSize: 30 },
  petCopy: { flex: 1, marginLeft: 12, paddingVertical: 3 },
  petTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  petName: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  verifiedPet: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.greenSoft, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 },
  verifiedPetText: { color: colors.green, fontSize: 8, fontWeight: '800' },
  petMeta: { color: colors.inkMuted, fontSize: 10, marginTop: 3 },
  traits: { flexDirection: 'row', gap: 5, marginTop: 8 },
  trait: { color: colors.greenDark, fontSize: 8, fontWeight: '700', backgroundColor: colors.greenSoft, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  health: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  healthText: { color: colors.green, fontSize: 9, fontWeight: '700' },
  editPet: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, borderRadius: radii.lg, padding: 13, minHeight: 126 },
  quickIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 13 },
  quickMeta: { color: colors.inkMuted, fontSize: 8, marginTop: 4 },
  menu: { backgroundColor: colors.white, borderRadius: radii.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  menuIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, marginLeft: 11 },
  menuLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  menuDetail: { color: colors.inkMuted, fontSize: 10, marginTop: 3 },
  logout: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 24 },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  version: { color: colors.inkMuted, fontSize: 9, textAlign: 'center' },
});
