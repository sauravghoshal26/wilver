import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Logo } from '@/src/components/Logo';
import { customerAuthError } from '@/src/lib/customerErrors';
import { supabase } from '@/src/lib/supabase';
import { colors, radii } from '@/src/theme';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = password.length >= 10 && password === confirmation;

  const save = async () => {
    if (!valid || !supabase) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('This reset link is no longer valid. Request a new one from the login screen.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'Your new password is active on this account.');
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not update password', customerAuthError(error instanceof Error ? error : null, 'Please request a new reset link.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Logo />
        <View style={styles.icon}><Feather name="key" size={24} color={colors.green} /></View>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.body}>Use at least 10 characters. Avoid passwords you use on other services.</Text>
        <Text style={styles.label}>New password</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" style={styles.input} placeholder="At least 10 characters" placeholderTextColor={colors.inkMuted} />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" style={styles.input} placeholder="Type it again" placeholderTextColor={colors.inkMuted} />
        {confirmation.length > 0 && password !== confirmation && <Text style={styles.error}>Passwords do not match.</Text>}
        <Button label="Update password" onPress={() => { void save(); }} loading={saving} disabled={!valid} style={styles.button} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  icon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginTop: 46 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 18 },
  body: { color: colors.inkMuted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 13, marginBottom: 7 },
  input: { height: 54, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.ink, fontSize: 14 },
  error: { color: colors.danger, fontSize: 11, marginTop: 7 },
  button: { marginTop: 22 },
});
