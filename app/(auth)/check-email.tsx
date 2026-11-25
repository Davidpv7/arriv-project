import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Header, Postmark, Screen, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

export default function CheckEmail() {
  const { t } = useTranslation();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header eyebrow={t('auth.checkEmail.eyebrow')} title={t('auth.checkEmail.title')} />
        <View style={styles.mark}>
          <Postmark
            lines={[{ text: t('auth.checkEmail.postmark'), style: 'mono' }, { text: '✉' }]}
            size={96}
          />
        </View>
        <Text variant="body">{t('auth.checkEmail.body', { email })}</Text>
        <Button
          label={t('auth.checkEmail.back')}
          variant="secondary"
          onPress={() => router.replace('/sign-in')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  mark: { alignItems: 'flex-start', paddingLeft: space[2] },
});
