import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { unregisterPush } from '@/lib/notifications';
import { env, supabase } from '@/lib/supabase';

import type {
  ForgotPasswordValues,
  NewPasswordValues,
  SignInValues,
  SignUpValues,
} from './schemas';

WebBrowser.maybeCompleteAuthSession();

/** Where email links and OAuth return to (app/auth/callback.tsx). */
/** Where auth emails and OAuth send people back. `next` picks the screen after it. */
export const authRedirectUrl = (next?: 'reset-password') =>
  Linking.createURL('auth/callback', next ? { queryParams: { next } } : undefined);

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
  if (message.includes('should be different')) return 'auth.errors.samePassword';
  if (message.includes('weak') || message.includes('at least')) return 'auth.errors.passwordShort';
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

/**
 * Emails a link to choose a new password. Resolves the same way whether or not the
 * email has an account, so the screen can't be used to find out who's on Arriv.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ email }: ForgotPasswordValues) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl('reset-password'),
      });
      // Only problems on our side are shown (rate limits, network); not "no such user".
      if (error && (error.status === 429 || error.message.toLowerCase().includes('fetch'))) {
        throw error;
      }
    },
  });
}

/** Sets a new password for the signed-in person (after a reset link, or from Settings). */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ password }: NewPasswordValues) => {
      const { error } = await supabase.auth.updateUser({ password });
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
      await unregisterPush();
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

/**
 * Deletes my account through the delete-account Edge Function (it removes my files,
 * then the account; the database removes the rest). Refused while I own a community.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean }>('delete-account', {
        method: 'POST',
      });
      if (error || !data?.ok) throw error ?? new Error('Account not deleted');
      // The account no longer exists; clear the local session (the server one is gone).
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    },
  });
}
