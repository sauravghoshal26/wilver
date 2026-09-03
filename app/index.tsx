import { Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/Button';
import { queryClient } from '@/src/lib/queryClient';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

export default function Index() {
  const { authInitialized, authenticated, onboarded, dataLoading, dataError, currentUser } = useAppStore();

  if (!authInitialized || (authenticated && dataLoading && !currentUser)) return <View style={styles.loading}><ActivityIndicator color={colors.green} size="large" /></View>;
  if (!authenticated) return <Redirect href="/(auth)/welcome" />;
  if (dataError && !currentUser) return <View style={styles.error}><View style={styles.errorIcon}><Feather name="wifi-off" size={28} color={colors.green} /></View><Text style={styles.errorTitle}>We couldn’t reach your circle.</Text><Text style={styles.errorBody}>{dataError}</Text><Button label="Try again" onPress={() => { void queryClient.invalidateQueries({ queryKey: ['production-snapshot'] }); }} style={styles.errorButton} /></View>;
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: 28 },
  errorIcon: { width: 72, height: 72, borderRadius: radii.lg, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: colors.ink, fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  errorBody: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 310, marginTop: 8 },
  errorButton: { width: '100%', maxWidth: 310, marginTop: 20 },
});
