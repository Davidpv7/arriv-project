import '@/i18n';

import { DMMono_500Medium } from '@expo-google-fonts/dm-mono/500Medium';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/features/auth/session';
import { useMyProfile } from '@/features/profile/api';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

// When a guard blocks a route, fall back to `index`, which sends the person to the right place.
export const unstable_settings = { anchor: 'index' };

/**
 * Who sees what:
 * - signed out → (auth)
 * - signed in, onboarding not finished → (onboarding)
 * - signed in and onboarded → (tabs) and the rest of the app
 * `index` (the redirector), `ds` and `auth/callback` are reachable in every state.
 */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, isLoading } = useSession();
  const profile = useMyProfile();
  const signedIn = !!session;
  const profileReady = !signedIn || profile.isSuccess || profile.isError;
  const onboarded = !!profile.data?.onboarded_at;
  const ready = fontsReady && !isLoading && profileReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      {/* Leaf screens (not groups) so a guard redirect lands on a real page, e.g. /welcome. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen
          name="(auth)/welcome"
          options={{ contentStyle: { backgroundColor: colors.navy } }}
        />
        <Stack.Screen name="(auth)/sign-in" />
        <Stack.Screen name="(auth)/sign-up" />
        <Stack.Screen name="(auth)/check-email" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)/origin" />
        <Stack.Screen name="(onboarding)/arrival" />
        <Stack.Screen name="(onboarding)/visa" />
        <Stack.Screen name="(onboarding)/city" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[handle]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/blocked" />
      </Stack.Protected>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="ds" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    DMMono_500Medium,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator fontsReady={fontsLoaded || !!fontError} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
