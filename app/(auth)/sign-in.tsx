import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/src/components/Button';
import { Logo } from '@/src/components/Logo';
import { legalDocumentsConfigured, publicEnvironment } from '@/src/config/environment';
import { customerAuthError } from '@/src/lib/customerErrors';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSignup = mode === 'signup';
  const signupAllowed = publicEnvironment.environment !== 'production' || legalDocumentsConfigured;
  const setSession = useAppStore((state) => state.setSession);
  const { control, getValues, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema), defaultValues: { email: '', password: '' },
  });

  const submit = async (values: FormValues) => {
    if (!supabase || !isSupabaseConfigured) {
      setError('root', { message: 'Wilver is temporarily unavailable. Please try again shortly.' });
      return;
    }
    if (isSignup && !signupAllowed) {
      setError('root', { message: 'New accounts are paused until the final Terms and Privacy documents are configured.' });
      return;
    }
    const result = isSignup
      ? await supabase.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: 'wilver://auth/callback' } })
      : await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (result.error) {
      setError('root', { message: customerAuthError(result.error) });
      return;
    }
    if (isSignup && !result.data.session) {
      Alert.alert('Confirm your email', 'Open the confirmation link we sent, then return to Wilver and log in.');
      router.replace('/(auth)/sign-in');
      return;
    }
    const userId = result.data.session?.user.id ?? result.data.user?.id;
    if (!userId) {
      setError('root', { message: 'Authentication succeeded without a usable session. Please log in again.' });
      return;
    }
    setSession(userId);
    router.replace('/');
  };

  const resetPassword = async () => {
    const email = getValues('email');
    if (!z.email().safeParse(email).success) {
      setError('email', { message: 'Enter your email first' });
      return;
    }
    if (!supabase) {
      Alert.alert('Temporarily unavailable', 'Password reset is unavailable right now. Please try again shortly.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'wilver://auth/reset-password' });
    if (error) setError('root', { message: customerAuthError(error, 'We couldn’t send the reset link. Please try again.') });
    else Alert.alert('Check your inbox', 'We sent a secure password-reset link.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back"><Feather name="arrow-left" size={22} color={colors.ink} /></Pressable>
            <Logo />
          </View>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{isSignup ? 'JOIN THE PACK' : 'WELCOME BACK'}</Text>
            <Text style={styles.title}>{isSignup ? 'Create your circle.' : 'Good to see you.'}</Text>
            <Text style={styles.subtitle}>{isSignup ? 'Start with your details—we’ll meet your pet next.' : 'Log in to see what your neighbourhood is up to.'}</Text>
          </View>
          {!isSupabaseConfigured && <View style={styles.availabilityBanner}><Feather name="clock" color={colors.coral} size={16} /><Text style={styles.availabilityText}>Membership access is temporarily unavailable. Please try again soon.</Text></View>}
          {isSignup && !signupAllowed && <View style={styles.availabilityBanner}><Feather name="clock" color={colors.coral} size={16} /><Text style={styles.availabilityText}>New memberships are briefly paused while we update our community policies.</Text></View>}
          <View style={styles.form}>
            <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
              <View><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} value={value} placeholder="you@example.com" placeholderTextColor={colors.inkMuted} style={[styles.input, errors.email && styles.inputError]} /><Text style={styles.error}>{errors.email?.message ?? ' '}</Text></View>
            )} />
            <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
              <View><Text style={styles.label}>Password</Text><TextInput accessibilityLabel="Password" autoComplete={isSignup ? 'new-password' : 'current-password'} secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} placeholder="At least 10 characters" placeholderTextColor={colors.inkMuted} style={[styles.input, errors.password && styles.inputError]} /><Text style={styles.error}>{errors.password?.message ?? ' '}</Text></View>
            )} />
            {!isSignup && <Pressable onPress={resetPassword} style={styles.forgot}><Text style={styles.forgotText}>Forgot password?</Text></Pressable>}
            {errors.root?.message && <Text style={styles.rootError}>{errors.root.message}</Text>}
            <Button label={isSignup ? 'Continue' : 'Log in'} onPress={handleSubmit(submit)} loading={isSubmitting} disabled={!isSupabaseConfigured || (isSignup && !signupAllowed)} />
          </View>
          <Pressable onPress={() => router.replace(isSignup ? '/(auth)/sign-in' : '/(auth)/sign-in?mode=signup')} style={styles.switcher}>
            <Text style={styles.switcherText}>{isSignup ? 'Already a member? Log in' : 'New here? Create an account'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  content: { padding: 22, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  heading: { marginTop: 58, marginBottom: 24 },
  eyebrow: { color: colors.coral, fontSize: 12, letterSpacing: 1.3, fontWeight: '800', marginBottom: 8 },
  title: { color: colors.ink, fontSize: 35, lineHeight: 40, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 22, marginTop: 10 },
  availabilityBanner: { flexDirection: 'row', gap: 9, backgroundColor: colors.greenSoft, padding: 13, borderRadius: radii.md, marginBottom: 20 },
  availabilityText: { color: colors.greenDark, fontSize: 12, lineHeight: 17, flex: 1 },
  form: { gap: 2 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 7, marginLeft: 3 },
  input: { height: 54, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, fontSize: 15, color: colors.ink },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, minHeight: 21, fontSize: 11, marginLeft: 4, paddingTop: 3 },
  rootError: { color: colors.danger, fontSize: 12, marginBottom: 12 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 4, marginTop: -10, marginBottom: 13 },
  forgotText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  switcher: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  switcherText: { color: colors.green, fontSize: 14, fontWeight: '700' },
});
