import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { brand } from '@/src/config/brand';
import { colors } from '@/src/theme';

type LogoProps = { light?: boolean; compact?: boolean };

export function Logo({ light = false, compact = false }: LogoProps) {
  return (
    <View style={styles.row} accessibilityLabel={brand.name}>
      <View style={styles.mark}><Image source={require('../../assets/wilver-mark-v2.png')} style={styles.markImage} contentFit="contain" /></View>
      {!compact && <Text style={[styles.word, light && styles.lightWord]}>{brand.wordmark}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 3 },
  markImage: { width: 39, height: 39 },
  word: { color: colors.ink, fontSize: 26, fontWeight: '900', letterSpacing: -1.4 },
  lightWord: { color: colors.white },
});
