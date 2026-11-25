import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, DateField, Header, Input, Screen, Text } from '@/components/ds';
import {
  isUniqueViolation,
  useMyProfile,
  useSaveProfile,
  type ProfileWithVisa,
} from '@/features/profile/api';
import { CityField } from '@/features/profile/components/CityField';
import { CountryField } from '@/features/profile/components/CountryField';
import { VisaFields } from '@/features/profile/components/VisaFields';
import { profileFormSchema, type ProfileFormValues } from '@/features/profile/schemas';
import { useErrorText } from '@/i18n/useErrorText';
import { colors, space } from '@/theme/tokens';

export default function EditProfile() {
  const { data } = useMyProfile();
  if (!data) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  return <EditProfileForm profile={data} />;
}

function EditProfileForm({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const save = useSaveProfile();
  const { control, handleSubmit, formState, setError } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.display_name,
      handle: profile.handle,
      bio: profile.bio ?? '',
      origin: profile.origin_country,
      city: profile.city ?? '',
      arrivedOn: profile.arrived_on,
      visa: {
        subclass: profile.visa?.visa_subclass ?? '',
        label: profile.visa?.visa_label ?? '',
        visibility: profile.visa?.visibility ?? 'connections',
      },
    },
  });
  const errors = formState.errors;

  const onSubmit = handleSubmit((v) =>
    save.mutate(
      {
        profile: {
          display_name: v.displayName,
          handle: v.handle,
          bio: v.bio || null,
          origin_country: v.origin,
          city: v.city || null,
          arrived_on: v.arrivedOn,
        },
        visa: {
          visa_subclass: v.visa.subclass || null,
          visa_label: v.visa.label || null,
          visibility: v.visa.visibility,
        },
      },
      {
        onSuccess: () => router.replace(`/profile/${v.handle}`),
        onError: (e) => {
          if (isUniqueViolation(e)) setError('handle', { message: 'profile.errors.handleTaken' });
        },
      },
    ),
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            backLabel={t('common.back')}
            title={t('profile.editTitle')}
          />
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Input
                label={t('profile.fields.name')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.displayName?.message)}
                maxLength={50}
              />
            )}
          />
          <Controller
            control={control}
            name="handle"
            render={({ field }) => (
              <Input
                label={t('profile.fields.handle')}
                hint={t('profile.fields.handleHint')}
                value={field.value}
                onChangeText={(v) => field.onChange(v.toLowerCase())}
                onBlur={field.onBlur}
                error={errorText(errors.handle?.message)}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            )}
          />
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <Input
                label={t('profile.fields.bio')}
                hint={t('profile.fields.bioHint')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(errors.bio?.message)}
                multiline
                maxLength={300}
              />
            )}
          />
          <Controller
            control={control}
            name="origin"
            render={({ field }) => (
              <CountryField
                label={t('profile.fields.origin')}
                value={field.value}
                onChange={field.onChange}
                error={errorText(errors.origin?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <CityField
                label={t('profile.fields.city')}
                value={field.value}
                onChange={field.onChange}
                error={errorText(errors.city?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="arrivedOn"
            render={({ field }) => (
              <DateField
                label={t('profile.fields.arrived')}
                value={field.value}
                onChange={field.onChange}
                parts={{ day: t('date.day'), month: t('date.month'), year: t('date.year') }}
                error={errorText(errors.arrivedOn?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="visa"
            render={({ field }) => (
              <VisaFields
                subclass={field.value.subclass}
                label={field.value.label}
                visibility={field.value.visibility}
                onChange={(patch) => field.onChange({ ...field.value, ...patch })}
                subclassError={errorText(errors.visa?.subclass?.message)}
                labelError={errorText(errors.visa?.label?.message)}
              />
            )}
          />
          {save.error && !isUniqueViolation(save.error) ? (
            <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
              {t('common.error')}
            </Text>
          ) : null}
          <Button
            label={t('common.save')}
            size="lg"
            fullWidth
            loading={save.isPending}
            onPress={() => void onSubmit()}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[5] },
});
