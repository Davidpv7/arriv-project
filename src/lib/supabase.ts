import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

import { readEnv } from './env';
import { sessionStorage } from './secure-storage';

export const env = readEnv();

/**
 * In development on a phone or emulator, 127.0.0.1 is the device itself. Point a local
 * Supabase URL at the computer running Metro instead (the same host Expo serves from).
 */
function resolveSupabaseUrl(url: string): string {
  if (!__DEV__ || Platform.OS === 'web') return url;
  const parsed = url.match(/^(https?:\/\/)(127\.0\.0\.1|localhost)(:\d+)?(.*)$/);
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!parsed || !devHost) return url;
  return `${parsed[1]}${devHost}${parsed[3] ?? ''}${parsed[4]}`;
}

/**
 * The one Supabase client. Uses the publishable (anon) key only; every access rule
 * is enforced by RLS in the database. Screens never import this directly: data access
 * lives in src/features/<area>/api.ts.
 */
export const supabase = createClient<Database>(
  resolveSupabaseUrl(env.EXPO_PUBLIC_SUPABASE_URL),
  env.EXPO_PUBLIC_SUPABASE_KEY,
  {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  },
);

// Refresh tokens only while the app is in the foreground (native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
