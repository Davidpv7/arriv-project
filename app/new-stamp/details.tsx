import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ds';
import { StampPreview } from '@/features/journey/components/StampPreview';
import {
  answers,
  NEW_STAMP_STEPS,
  stepErrors,
  useNewStamp,
} from '@/features/journey/newStampStore';
import { PLACE_MAX, SUBCLASS_KINDS, TITLE_MAX } from '@/features/journey/rules';
import { StepLayout } from '@/features/shared/StepLayout';
import { useErrorText } from '@/i18n/useErrorText';

/** Step 3: title, and the subclass or place that appear on the stamp. */
export default function StampDetailsStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const stamp = useNewStamp();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const next = () => {
    const found = stepErrors(answers(stamp), ['title', 'visaSubclass', 'place']);
    if (Object.keys(found).length > 0) return setErrors(found);
    router.push(stamp.status === 'done' ? '/new-stamp/visibility' : '/new-stamp/remind');
  };
  const change = (patch: Parameters<typeof stamp.set>[0]) => {
    setErrors({});
    stamp.set(patch);
  };

  return (
    <StepLayout
      step={3}
      total={NEW_STAMP_STEPS}
      title={t('journey.wizard.details.title')}
      body={t('journey.wizard.details.body')}
      primary={{ label: t('common.continue'), disabled: !stamp.title.trim(), onPress: next }}
    >
      <StampPreview />
      <Input
        label={t('journey.form.title')}
        placeholder={t('journey.form.titlePlaceholder')}
        value={stamp.title}
        onChangeText={(title) => change({ title })}
        maxLength={TITLE_MAX}
        error={errorText(errors.title)}
      />
      {SUBCLASS_KINDS.includes(stamp.kind) && (
        <Input
          label={t('journey.form.subclass')}
          placeholder={t('journey.form.subclassPlaceholder')}
          value={stamp.visaSubclass}
          onChangeText={(visaSubclass) => change({ visaSubclass })}
          keyboardType="number-pad"
          maxLength={3}
          error={errorText(errors.visaSubclass)}
        />
      )}
      <Input
        label={t('journey.form.place')}
        placeholder={t('journey.form.placePlaceholder')}
        hint={t('journey.form.placeHint')}
        autoCapitalize="characters"
        autoCorrect={false}
        value={stamp.place}
        onChangeText={(place) => change({ place: place.toUpperCase() })}
        maxLength={PLACE_MAX}
        error={errorText(errors.place)}
      />
    </StepLayout>
  );
}
