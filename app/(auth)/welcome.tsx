import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BoardingPass, Button, Screen, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

/** Navy "AU Arrivals" screen with a blank boarding pass. */
export default function Welcome() {
  const { t } = useTranslation();
  return (
    <Screen scroll background="navy" edges={['top', 'bottom']}>
      <View style={styles.stack}>
        <View style={styles.intro}>
          <Text variant="label" color="sunshine">
            {t('auth.welcome.eyebrow')}
          </Text>
          <Text variant="display" color="onNavy" accessibilityRole="header">
            {t('auth.welcome.title')}
          </Text>
          <Text variant="body" color="onNavyMuted">
            {t('auth.welcome.body')}
          </Text>
        </View>

        <BoardingPass
          background="navy"
          eyebrowStart={t('boardingPass.eyebrow')}
          eyebrowEnd={t('boardingPass.carrier')}
          name={t('auth.welcome.passName')}
          from={{ code: '???' }}
          to={{ code: 'AUS', city: t('auth.welcome.australia') }}
          fields={[
            { label: t('boardingPass.visa'), value: '—' },
            { label: t('boardingPass.day'), value: '1' },
            { label: t('boardingPass.stamps'), value: '0' },
          ]}
          showPlane
        />

        <View style={styles.actions}>
          <Button
            label={t('auth.welcome.cta')}
            size="lg"
            fullWidth
            onPress={() => router.push('/sign-up')}
          />
          <Button
            label={t('auth.welcome.signIn')}
            variant="onNavy"
            fullWidth
            onPress={() => router.push('/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] + space[2], paddingTop: space[6] },
  intro: { gap: space[3] },
  actions: { gap: space[3] },
});
