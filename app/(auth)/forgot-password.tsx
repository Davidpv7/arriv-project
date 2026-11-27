import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Input, Notice, Screen, Text } from '@/components/ds';
import { authErrorKey, useRequestPasswordReset } from '@/features/auth/api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

/** Ask for a link to choose a new password. */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const request = useRequestPasswordReset();
  const { control, handleSubmit, formState, getValues } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const onSubmit = handleSubmit((values) => request.mutate(values));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
            backLabel={t('common.back')}
            eyebrow={t('auth.forgot.eyebrow')}
            title={t('auth.forgot.title')}
          />
          {request.isSuccess ? (
            <>
              <Notice
                eyebrow={t('auth.forgot.sentTitle')}
                body={t('auth.forgot.sentBody', { email: getValues('email').trim() })}
                tone="sky"
              />
              <Text variant="meta" color="muted">
                {t('auth.forgot.sentHint')}
              </Text>
              <Button
                label={t('auth.forgot.backToSignIn')}
                size="lg"
                fullWidth
                onPress={() => router.replace('/sign-in')}
              />
            </>
          ) : (
            <>
              <Text variant="body" color="muted">
                {t('auth.forgot.body')}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    label={t('auth.fields.email')}
                    placeholder={t('auth.fields.emailPlaceholder')}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errorText(formState.errors.email?.message)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    autoFocus
                    onSubmitEditing={() => void onSubmit()}
                  />
                )}
              />
              {request.error ? (
                <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
                  {errorText(authErrorKey(request.error))}
                </Text>
              ) : null}
              <Button
                label={t('auth.forgot.submit')}
                size="lg"
                fullWidth
                loading={request.isPending}
                onPress={() => void onSubmit()}
              />
            </>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[4] },
});
