import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Input, Notice, Screen, Text } from '@/components/ds';
import { authErrorKey, useUpdatePassword } from '@/features/auth/api';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

/**
 * Choose a new password. Reached from a reset email (the link signs you in first)
 * or from Settings -> Change password. Without a session the link has expired.
 */
export default function ResetPassword() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { session, isLoading } = useSession();
  const update = useUpdatePassword();
  const { control, handleSubmit, formState } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const onSubmit = handleSubmit((values) => update.mutate(values));
  const leave = () => router.replace('/');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll edges={['top', 'bottom']}>
        <View style={styles.stack}>
          <Header
            onBack={router.canGoBack() ? () => router.back() : undefined}
            backLabel={t('common.back')}
            eyebrow={t('auth.reset.eyebrow')}
            title={t('auth.reset.title')}
          />
          {!isLoading && !session ? (
            <>
              <Text variant="body">{t('auth.reset.expired')}</Text>
              <Button
                label={t('auth.reset.requestAgain')}
                size="lg"
                fullWidth
                onPress={() => router.replace('/forgot-password')}
              />
            </>
          ) : update.isSuccess ? (
            <>
              <Notice
                eyebrow={t('auth.reset.doneTitle')}
                body={t('auth.reset.doneBody')}
                tone="sky"
              />
              <Button label={t('common.continue')} size="lg" fullWidth onPress={leave} />
            </>
          ) : (
            <>
              <Text variant="body" color="muted">
                {t('auth.reset.body')}
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <Input
                    label={t('auth.reset.newPassword')}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errorText(formState.errors.password?.message)}
                    hint={t('auth.reset.hint')}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    autoFocus
                  />
                )}
              />
              <Controller
                control={control}
                name="confirm"
                render={({ field }) => (
                  <Input
                    label={t('auth.reset.confirm')}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errorText(formState.errors.confirm?.message)}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    onSubmitEditing={() => void onSubmit()}
                  />
                )}
              />
              {update.error ? (
                <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
                  {errorText(authErrorKey(update.error))}
                </Text>
              ) : null}
              <Button
                label={t('auth.reset.submit')}
                size="lg"
                fullWidth
                loading={update.isPending}
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
