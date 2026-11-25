import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Screen, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

export type StepLayoutProps = {
  step: number;
  total: number;
  /** Defaults to going back a step (hidden on step 1). Pass one to show a back/close on step 1. */
  onBack?: () => void;
  title: string;
  body: string;
  children: ReactNode;
  primary: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  onSkip?: () => void;
  error?: string;
};

/** Shared frame for step-by-step flows (onboarding, starting a crew): step count, question, content, actions. */
export function StepLayout({
  step,
  total,
  onBack,
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
            onBack={onBack ?? (step > 1 && router.canGoBack() ? () => router.back() : undefined)}
            backLabel={t('common.back')}
            eyebrow={t('onboarding.step', { current: step, total })}
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
