const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

const hasPlaceholder = (value?: string) => !value || value.includes('your-project') || value.includes('your-publishable');

export const publicEnvironment = {
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT?.trim() || 'development',
  supabaseUrl,
  supabasePublishableKey,
  supabaseConfigured: !hasPlaceholder(supabaseUrl) && !hasPlaceholder(supabasePublishableKey),
  termsVersion: process.env.EXPO_PUBLIC_TERMS_VERSION?.trim() || 'draft-2026-08',
  privacyVersion: process.env.EXPO_PUBLIC_PRIVACY_VERSION?.trim() || 'draft-2026-08',
} as const;

export const legalDocumentsConfigured = !publicEnvironment.termsVersion.startsWith('draft-')
  && !publicEnvironment.privacyVersion.startsWith('draft-');

export function assertProductionBackendConfigured() {
  if (!publicEnvironment.supabaseConfigured) {
    throw new Error(
      'Wilver production mode is not connected. Configure EXPO_PUBLIC_SUPABASE_URL and '
      + 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
}
