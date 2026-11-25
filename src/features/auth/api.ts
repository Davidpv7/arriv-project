import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { env, supabase } from '@/lib/supabase';

import type { SignInValues, SignUpValues } from './schemas';

WebBrowser.maybeCompleteAuthSession();

/** Where email links and OAuth return to (app/auth/callback.tsx). */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

export type OAuthProvider = 'google' | 'apple';

export const enabledOAuthProviders: OAuthProvider[] = [
  ...(env.EXPO_PUBLIC_AUTH_GOOGLE ? (['google'] as const) : []),
  ...(env.EXPO_PUBLIC_AUTH_APPLE ? (['apple'] as const) : []),
];

/** Maps Supabase auth errors to i18n keys the screens can show. */
export function authErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'auth.errors.invalidCredentials';
  if (message.includes('already registered')) return 'auth.errors.alreadyRegistered';
  if (message.includes('email not confirmed')) return 'auth.errors.notConfirmed';
  if (message.includes('rate limit')) return 'auth.errors.rateLimited';
  if (message.includes('network') || message.includes('fetch')) return 'auth.errors.network';
  return 'auth.errors.generic';
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInValues) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });
}

/** Resolves to `needsConfirmation: true` when the project requires email confirmation. */
export function useSignUp() {
  return useMutation({
    mutationFn: async ({ displayName, email, password }: SignUpValues) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: authRedirectUrl(),
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

/** Exchanges the `code` from an email link or OAuth redirect for a session. */
export async function exchangeAuthCode(code: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return; // already exchanged (e.g. the link was delivered twice)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export function useOAuthSignIn() {
  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const redirectTo = authRedirectUrl();
      if (Platform.OS === 'web') {
        // Full-page redirect; the client picks up the code on return.
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return; // cancelled
      const code = Linking.parse(result.url).queryParams?.code;
      if (typeof code === 'string') await exchangeAuthCode(code);
    },
  });
}
