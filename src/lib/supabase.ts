import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { publicEnvironment } from '@/src/config/environment';
import { authStorage } from '@/src/lib/authStorage';

const { supabaseUrl: url, supabasePublishableKey: publishableKey } = publicEnvironment;

export const isSupabaseConfigured = publicEnvironment.supabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
