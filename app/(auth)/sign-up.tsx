import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Input, Notice, Screen, Text } from '@/components/ds';
import { authErrorKey, useSignUp } from '@/features/auth/api';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

export default function SignUp() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const signUp = useSignUp();
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) =>
    signUp.mutate(values, {
      onSuccess: ({ needsConfirmation }) => {
        if (needsConfirmation) {
          router.replace({ pathname: '/check-email', params: { email: values.email } });
        }
        // Otherwise the new session moves the app to onboarding.
      },
    }),
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
            backLabel={t('common.back')}
            eyebrow={t('auth.signUp.eyebrow')}
            title={t('auth.signUp.title')}
          />
          <OAuthButtons />
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Input
                label={t('auth.fields.name')}
                placeholder={t('auth.fields.namePlaceholder')}
                hint={t('auth.fields.nameHint')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(formState.errors.displayName?.message)}
                autoComplete="name"
                textContentType="name"
                maxLength={50}
              />
            )}
          />
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
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                label={t('auth.fields.password')}
                hint={t('auth.fields.passwordHint')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(formState.errors.password?.message)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={() => void onSubmit()}
              />
            )}
          />
          {signUp.error ? (
            <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
              {errorText(authErrorKey(signUp.error))}
            </Text>
          ) : null}
          <Button
            label={t('auth.signUp.submit')}
            size="lg"
            fullWidth
            loading={signUp.isPending}
            onPress={() => void onSubmit()}
          />
          <Notice eyebrow={t('notice.customsEyebrow')} body={t('auth.signUp.terms')} tone="sky" />
          <Link href="/sign-in" replace style={styles.link}>
            <Text variant="meta" color="rust">
              {t('auth.signUp.haveAccount')}
            </Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[4] },
  link: { alignSelf: 'center', paddingVertical: space[3] },
});
