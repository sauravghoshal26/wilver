import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

type AvatarProps = { uri?: string; size?: number; verified?: boolean };

export function Avatar({ uri, size = 44, verified }: AvatarProps) {
  return (
    <View style={{ width: size, height: size }}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.greenSoft }} contentFit="cover" transition={180} />
        : <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}><Text style={{ fontSize: Math.max(14, size * 0.4) }}>🐾</Text></View>}
      {verified && <View style={styles.badge}><Text style={styles.check}>✓</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  check: { color: colors.white, fontSize: 9, fontWeight: '900' },
});
