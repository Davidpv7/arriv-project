import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Header, Notice, Screen, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

export type LegalDoc = 'privacy' | 'terms' | 'guidelines';
type Section = { heading: string; body: string[] };

/** When the documents last changed. Update with every edit to their text. */
export const LEGAL_UPDATED = '26 November 2026';
/** True until a lawyer has reviewed the documents (decided 26 Nov 2026). */
export const LEGAL_DRAFT = true;

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** A public legal page (no sign-in needed): title, intro, then headed sections. */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as unknown as Section[];

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('legal.eyebrow')}
          title={t(`legal.${doc}.title`)}
        />
        <Text variant="meta" color="muted">
          {t('legal.updated', { date: LEGAL_UPDATED })}
        </Text>
        {LEGAL_DRAFT && <Notice eyebrow={t('legal.draftTitle')} body={t('legal.draftBody')} />}
        <Text variant="body">{t(`legal.${doc}.intro`)}</Text>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text variant="heading" accessibilityRole="header">
              {section.heading}
            </Text>
            {section.body.map((line) =>
              line.startsWith('• ') ? (
                <View key={line} style={styles.bullet}>
                  <Text variant="body" color="rust">
                    •
                  </Text>
                  <Text variant="body" style={styles.flex}>
                    {line.slice(2)}
                  </Text>
                </View>
              ) : (
                <Text key={line} variant="body">
                  {line}
                </Text>
              ),
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5], paddingBottom: space[6] },
  section: { gap: space[2] },
  bullet: { flexDirection: 'row', gap: space[2], paddingLeft: space[1] },
  flex: { flex: 1 },
});
