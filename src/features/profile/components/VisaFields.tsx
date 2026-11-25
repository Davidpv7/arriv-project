import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ChoiceList, Input, Text, type ChoiceOption } from '@/components/ds';
import { space } from '@/theme/tokens';

import type { Visibility } from '../schemas';

export function useVisibilityOptions(): ChoiceOption<Visibility>[] {
  const { t } = useTranslation();
  return [
    {
      value: 'public',
      label: t('visibility.public'),
      description: t('visibility.publicDesc'),
      icon: 'globe',
    },
    {
      value: 'connections',
      label: t('visibility.connections'),
      description: t('visibility.connectionsDesc'),
      icon: 'communities',
    },
    {
      value: 'private',
      label: t('visibility.private'),
      description: t('visibility.privateDesc'),
      icon: 'lock',
    },
  ];
}

export type VisaFieldsProps = {
  subclass: string;
  label: string;
  visibility: Visibility;
  onChange: (patch: { subclass?: string; label?: string; visibility?: Visibility }) => void;
  subclassError?: string;
  labelError?: string;
};

/** Visa subclass or free-text label, plus who can see it. Never asks for expiry. */
export function VisaFields({
  subclass,
  label,
  visibility,
  onChange,
  subclassError,
  labelError,
}: VisaFieldsProps) {
  const { t } = useTranslation();
  const options = useVisibilityOptions();
  return (
    <View style={styles.wrap}>
      <Input
        label={t('onboarding.visa.subclass')}
        value={subclass}
        onChangeText={(v) => onChange({ subclass: v.replace(/\D/g, '').slice(0, 3) })}
        placeholder={t('onboarding.visa.subclassPlaceholder')}
        hint={t('onboarding.visa.subclassHint')}
        error={subclassError}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Input
        label={t('onboarding.visa.label')}
        value={label}
        onChangeText={(v) => onChange({ label: v })}
        placeholder={t('onboarding.visa.labelPlaceholder')}
        error={labelError}
        maxLength={60}
      />
      <View style={styles.visibility}>
        <Text variant="label" color="muted">
          {t('onboarding.visa.visibility')}
        </Text>
        <ChoiceList
          options={options}
          value={visibility}
          onChange={(v) => onChange({ visibility: v })}
          accessibilityLabel={t('onboarding.visa.visibility')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  visibility: { gap: space[2] },
});
