import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { colors, radii } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.icon}><Feather name="compass" size={30} color={colors.green} /></View>
      <Text style={styles.title}>That path wandered off.</Text>
      <Text style={styles.body}>The page may have moved, but your Wilver community is right where you left it.</Text>
      <Button label="Return home" onPress={() => router.replace('/')} style={styles.button} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: 28 },
  icon: { width: 72, height: 72, borderRadius: radii.lg, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 18, textAlign: 'center' },
  body: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  button: { width: '100%', maxWidth: 300, marginTop: 20 },
});
