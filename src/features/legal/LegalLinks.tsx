import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text as RNText } from 'react-native';

import { Text } from '@/components/ds';
import { colors, fonts } from '@/theme/tokens';

/** "By creating an account you confirm you're 18 or older and agree to the Terms of use and Privacy policy." */
export function SignUpLegalNotice() {
  const { t } = useTranslation();
  return (
    <Text variant="meta" color="muted">
      {`${t('legal.signUpNotice')} `}
      <RNText style={styles.link} accessibilityRole="link" onPress={() => router.push('/terms')}>
        {t('legal.links.terms')}
      </RNText>
      {` ${t('legal.and')} `}
      <RNText style={styles.link} accessibilityRole="link" onPress={() => router.push('/privacy')}>
        {t('legal.links.privacy')}
      </RNText>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.rust, fontFamily: fonts.sans700, textDecorationLine: 'underline' },
});
