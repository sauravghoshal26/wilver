import { QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ErrorBoundaryProps, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';
import { Button } from '@/src/components/Button';
import { ProductionDataBridge } from '@/src/components/ProductionDataBridge';
import { parseAuthLink } from '@/src/lib/authLinks';
import { customerAuthError } from '@/src/lib/customerErrors';
import { listenForNotificationNavigation } from '@/src/lib/pushNotifications';
import { queryClient } from '@/src/lib/queryClient';
import { supabase } from '@/src/lib/supabase';
import { useAppStore } from '@/src/store/useAppStore';

export default function RootLayout() {
  const setSession = useAppStore((state) => state.setSession);
  const setAuthInitialized = useAppStore((state) => state.setAuthInitialized);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setAuthInitialized(true);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => setSession(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session?.user.id ?? null);
      if (event === 'PASSWORD_RECOVERY') router.replace('/(auth)/reset-password');
    });
    return () => data.subscription.unsubscribe();
  }, [setAuthInitialized, setSession]);

  useEffect(() => {
    if (!supabase) return;
    const authClient = supabase;
    const handled = new Set<string>();
    const handleUrl = async (url: string | null) => {
      if (!url || handled.has(url)) return;
      handled.add(url);
      try {
        const link = parseAuthLink(url);
        if (link.error) throw new Error(link.error);
        if (link.code) {
          const { error } = await authClient.auth.exchangeCodeForSession(link.code);
          if (error) throw error;
        } else if (link.accessToken && link.refreshToken) {
          const { error } = await authClient.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
          if (error) throw error;
        } else {
          return;
        }
        router.replace(link.type === 'recovery' || /reset-password/.test(url) ? '/(auth)/reset-password' : '/');
      } catch (error) {
        Alert.alert('Sign-in link failed', customerAuthError(error instanceof Error ? error : null, 'Request a new link and try again.'));
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => { void handleUrl(url); });
    return () => subscription.remove();
  }, []);

  useEffect(() => listenForNotificationNavigation(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ProductionDataBridge />
        <StatusBar style="dark" />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
        }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <View style={styles.errorMark}><Text style={styles.errorPaw}>🐾</Text></View>
      <Text style={styles.errorTitle}>We chased the wrong tail.</Text>
      <Text style={styles.errorBody}>Something unexpected happened. Your account and community data are safe.</Text>
      <Button label="Try again" onPress={retry} style={styles.errorButton} />
      <Button label="Back to home" onPress={() => router.replace('/')} variant="ghost" style={styles.errorButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorScreen: { flex: 1, backgroundColor: colors.cream, padding: 28, justifyContent: 'center', alignItems: 'center' },
  errorMark: { width: 72, height: 72, borderRadius: 26, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  errorPaw: { fontSize: 30 },
  errorTitle: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.7, marginTop: 18, textAlign: 'center' },
  errorBody: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, marginBottom: 18, maxWidth: 320 },
  errorButton: { width: '100%', maxWidth: 320, marginTop: 8 },
});
