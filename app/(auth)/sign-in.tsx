import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, Header, Input, Screen, Text } from '@/components/ds';
import { authErrorKey, useSignIn } from '@/features/auth/api';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

export default function SignIn() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const signIn = useSignIn();
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => signIn.mutate(values));

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
            eyebrow={t('auth.signIn.eyebrow')}
            title={t('auth.signIn.title')}
          />
          <OAuthButtons />
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
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(formState.errors.password?.message)}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={() => void onSubmit()}
              />
            )}
          />
          {signIn.error ? (
            <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
              {errorText(authErrorKey(signIn.error))}
            </Text>
          ) : null}
          <Button
            label={t('auth.signIn.submit')}
            size="lg"
            fullWidth
            loading={signIn.isPending}
            onPress={() => void onSubmit()}
          />
          <Link href="/sign-up" replace style={styles.link}>
            <Text variant="meta" color="rust">
              {t('auth.signIn.noAccount')}
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
