import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ds';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

import { authErrorKey, enabledOAuthProviders, useOAuthSignIn } from '../api';

/** Google / Apple buttons, shown only for providers switched on in .env. */
export function OAuthButtons() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const oauth = useOAuthSignIn();
  if (enabledOAuthProviders.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {enabledOAuthProviders.map((provider) => (
        <Button
          key={provider}
          label={t(provider === 'google' ? 'auth.google' : 'auth.apple')}
          variant="secondary"
          fullWidth
          loading={oauth.isPending && oauth.variables === provider}
          disabled={oauth.isPending}
          onPress={() => oauth.mutate(provider)}
        />
      ))}
      {oauth.error ? (
        <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
          {errorText(authErrorKey(oauth.error))}
        </Text>
      ) : null}
      <Text variant="label" color="muted" align="center">
        {t('auth.or')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
});
