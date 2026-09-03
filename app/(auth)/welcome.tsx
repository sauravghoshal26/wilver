import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Logo } from '@/src/components/Logo';
import { FadeInView } from '@/src/components/Motion';
import { brand } from '@/src/config/brand';
import { legalDocumentsConfigured, publicEnvironment } from '@/src/config/environment';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import { colors, radii } from '@/src/theme';

export default function WelcomeScreen() {
  const productionLegalBlock = publicEnvironment.environment === 'production' && !legalDocumentsConfigured;
  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#FFF7FB', '#F4F0FF', '#E8FCF9']} locations={[0, 0.56, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.blob, styles.blobCoral]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobViolet]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobAqua]} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><Logo /></View>
        <View style={styles.content}>
          <FadeInView delay={40} offset={18} style={styles.artWrap}>
            <View style={styles.artGlow} />
            <View style={styles.artCard}><Image source={require('../../assets/wilver-mark-v2.png')} style={styles.heroMark} contentFit="contain" /></View>
            <View style={[styles.floatChip, styles.floatChipOne]}><Text style={styles.floatEmoji}>🐾</Text><Text style={styles.floatText}>Local friends</Text></View>
            <View style={[styles.floatChip, styles.floatChipTwo]}><Feather name="shield" size={14} color={colors.green} /><Text style={styles.floatText}>Safer circles</Text></View>
          </FadeInView>
          <FadeInView delay={110}><View style={styles.pill}><View style={styles.liveDot} /><Text style={styles.pillText}>{brand.story}</Text></View></FadeInView>
          <FadeInView delay={170}><Text style={styles.title}>Find your people.{`\n`}Bring your pet.</Text><Text style={styles.subtitle}>A joyful local circle for trusted pet parents, real friendships, and safer adventures together.</Text></FadeInView>
          <FadeInView delay={230}>
            {!isSupabaseConfigured && <View style={styles.setup}><Feather name="clock" color={colors.yellow} size={16} /><Text style={styles.setupText}>Early access is temporarily unavailable while we prepare the community. Please check back soon.</Text></View>}
            {productionLegalBlock && <View style={styles.setup}><Feather name="clock" color={colors.yellow} size={16} /><Text style={styles.setupText}>New memberships are briefly paused while we update our community policies.</Text></View>}
            <Button label="Join Wilver" onPress={() => router.push('/(auth)/sign-in?mode=signup')} disabled={!isSupabaseConfigured || productionLegalBlock} style={styles.button} />
            <Pressable disabled={!isSupabaseConfigured} onPress={() => router.push('/(auth)/sign-in')} style={styles.login}><Text style={styles.loginText}>Already a member? <Text style={styles.loginStrong}>Log in</Text></Text></Pressable>
            <View style={styles.legal}><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'terms' } })}><Text style={styles.legalText}>Terms</Text></Pressable><Text style={styles.legalDot}>·</Text><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'privacy' } })}><Text style={styles.legalText}>Privacy</Text></Pressable><Text style={styles.legalDot}>·</Text><Pressable onPress={() => router.push({ pathname: '/legal/[document]', params: { document: 'guidelines' } })}><Text style={styles.legalText}>Guidelines</Text></Pressable></View>
          </FadeInView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: { paddingTop: 8, zIndex: 2 },
  content: { flex: 1, justifyContent: 'flex-end', paddingBottom: 16 },
  blob: { position: 'absolute', borderRadius: 999 },
  blobCoral: { width: 270, height: 270, backgroundColor: 'rgba(255,92,122,0.13)', top: -85, right: -105 },
  blobViolet: { width: 330, height: 330, backgroundColor: 'rgba(119,88,255,0.11)', left: -190, top: 170 },
  blobAqua: { width: 230, height: 230, backgroundColor: 'rgba(46,214,197,0.13)', right: -130, bottom: 160 },
  artWrap: { height: 220, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 4 },
  artGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.72)', shadowColor: colors.lilac, shadowOpacity: 0.18, shadowRadius: 35, shadowOffset: { width: 0, height: 12 } },
  artCard: { width: 174, height: 174, borderRadius: 56, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }], shadowColor: colors.green, shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.18, shadowRadius: 26, elevation: 6 },
  heroMark: { width: 153, height: 153 },
  floatChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.96)', shadowColor: colors.ink, shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  floatChipOne: { left: 3, top: 64, transform: [{ rotate: '-5deg' }] },
  floatChipTwo: { right: 0, bottom: 37, transform: [{ rotate: '4deg' }] },
  floatEmoji: { fontSize: 14 },
  floatText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, marginBottom: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.aqua },
  pillText: { color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 0.1 },
  title: { color: colors.ink, fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -1.8 },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 22, marginTop: 11, marginBottom: 19, maxWidth: 430 },
  button: { marginBottom: 10 },
  setup: { flexDirection: 'row', gap: 8, padding: 11, borderRadius: radii.md, backgroundColor: colors.yellowSoft, marginBottom: 12 },
  setupText: { flex: 1, color: colors.ink, fontSize: 10, lineHeight: 15 },
  login: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  loginText: { color: colors.inkMuted, fontSize: 14 },
  loginStrong: { color: colors.green, fontWeight: '800' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, minHeight: 28 },
  legalText: { color: colors.inkMuted, fontSize: 10, textDecorationLine: 'underline' },
  legalDot: { color: colors.inkSoft, fontSize: 10 },
});
