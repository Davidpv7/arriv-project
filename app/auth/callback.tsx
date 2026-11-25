import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ds';
import { exchangeAuthCode } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { colors, space } from '@/theme/tokens';

/** Landing point for email confirmation links and OAuth redirects (`?code=`). */
export default function AuthCallback() {
  const { t } = useTranslation();
  const { code, error_description } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const { session } = useSession();
  const [failed, setFailed] = useState(!!error_description);

  useEffect(() => {
    if (session) {
      router.replace('/');
      return;
    }
    if (!code || error_description) {
      // On web the client exchanges the code itself; give it a moment before failing.
      const timer = setTimeout(() => setFailed(true), 4000);
      return () => clearTimeout(timer);
    }
    exchangeAuthCode(code).catch(() => setFailed(true));
  }, [code, error_description, session]);

  return (
    <Screen>
      <View style={styles.center}>
        {failed ? (
          <>
            <Text variant="body" align="center">
              {t('auth.callback.failed')}
            </Text>
            <Button
              label={t('auth.callback.toSignIn')}
              onPress={() => router.replace('/sign-in')}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.navy} />
            <Text variant="meta" color="muted">
              {t('auth.callback.working')}
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] },
});
