import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Screen, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

export const ONBOARDING_STEPS = 4;

export type StepLayoutProps = {
  step: number;
  title: string;
  body: string;
  children: ReactNode;
  primary: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  onSkip?: () => void;
  error?: string;
};

/** Shared frame for onboarding steps: step count, question, content, actions. */
export function StepLayout({
  step,
  title,
  body,
  children,
  primary,
  onSkip,
  error,
}: StepLayoutProps) {
  const { t } = useTranslation();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={step > 1 && router.canGoBack() ? () => router.back() : undefined}
            backLabel={t('common.back')}
            eyebrow={t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}
            title={title}
          />
          <Text variant="body" color="muted">
            {body}
          </Text>
          {children}
          {error ? (
            <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={primary.label}
              size="lg"
              fullWidth
              onPress={primary.onPress}
              disabled={primary.disabled}
              loading={primary.loading}
            />
            {onSkip && (
              <Button label={t('common.skip')} variant="secondary" fullWidth onPress={onSkip} />
            )}
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[4] },
  actions: { gap: space[3], marginTop: space[4] },
});
