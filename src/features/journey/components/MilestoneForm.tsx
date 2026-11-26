import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, DateField, Input, Text } from '@/components/ds';
import {
  MILESTONE_KINDS,
  NOTES_MAX,
  PLACE_MAX,
  SUBCLASS_KINDS,
  TITLE_MAX,
  milestoneFormSchema,
  type MilestoneFormInput,
  type MilestoneFormValues,
} from '@/features/journey/rules';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

type Field = keyof MilestoneFormInput;
type Errors = Partial<Record<Field, string>>;

type Props = {
  initial: MilestoneFormInput;
  saving: boolean;
  /** A save error to show above the button (e.g. the network failed). */
  saveError?: string;
  onSubmit: (values: MilestoneFormValues) => void;
};

/** Add or edit a milestone. Done stamps have a date; coming-up items a due date and reminder. */
export function MilestoneForm({ initial, saving, saveError, onSubmit }: Props) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [v, setV] = useState<MilestoneFormInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const dateParts = { day: t('date.day'), month: t('date.month'), year: t('date.year') };

  const set = <K extends Field>(key: K, value: MilestoneFormInput[K]) => {
    setV((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const parsed = milestoneFormSchema.safeParse(v);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field | undefined;
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit(parsed.data);
  };

  const done = v.status === 'done';

  return (
    <View style={styles.stack}>
      <View style={styles.group}>
        <Text variant="label" color="muted">
          {t('journey.form.kind')}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MILESTONE_KINDS.map((k) => (
            <Chip
              key={k}
              label={t(`journey.kinds.${k}`)}
              selected={v.kind === k}
              onPress={() => set('kind', k)}
            />
          ))}
        </View>
      </View>

      <Input
        label={t('journey.form.title')}
        placeholder={t('journey.form.titlePlaceholder')}
        value={v.title}
        onChangeText={(text) => set('title', text)}
        maxLength={TITLE_MAX}
        error={errorText(errors.title)}
      />

      <View style={styles.group}>
        <Text variant="label" color="muted">
          {t('journey.form.status')}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip
            label={t('journey.form.statusDone')}
            selected={done}
            onPress={() => set('status', 'done')}
          />
          <Chip
            label={t('journey.form.statusUpcoming')}
            selected={!done}
            onPress={() => set('status', 'upcoming')}
          />
        </View>
      </View>

      {done ? (
        <DateField
          label={t('journey.form.happenedOn')}
          value={v.happenedOn}
          onChange={(date) => set('happenedOn', date)}
          parts={dateParts}
          error={errorText(errors.happenedOn)}
        />
      ) : (
        <>
          <DateField
            label={t('journey.form.dueOn')}
            value={v.dueOn}
            onChange={(date) => set('dueOn', date)}
            parts={dateParts}
            error={errorText(errors.dueOn)}
          />
          <DateField
            label={t('journey.form.remindOn')}
            value={v.remindOn}
            onChange={(date) => set('remindOn', date)}
            parts={dateParts}
            hint={t('journey.form.remindHint')}
            error={errorText(errors.remindOn)}
          />
        </>
      )}

      {SUBCLASS_KINDS.includes(v.kind) && (
        <Input
          label={t('journey.form.subclass')}
          placeholder={t('journey.form.subclassPlaceholder')}
          value={v.visaSubclass}
          onChangeText={(text) => set('visaSubclass', text)}
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
        value={v.place}
        onChangeText={(text) => set('place', text.toUpperCase())}
        maxLength={PLACE_MAX}
        error={errorText(errors.place)}
      />

      <Input
        label={t('journey.form.notes')}
        value={v.notes}
        onChangeText={(text) => set('notes', text)}
        multiline
        maxLength={NOTES_MAX}
        hint={t('journey.form.notesHint')}
        error={errorText(errors.notes)}
      />

      {done && (
        <View style={styles.group}>
          <Text variant="label" color="muted">
            {t('journey.form.visibilityLabel')}
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {(['private', 'connections', 'public'] as const).map((option) => (
              <Chip
                key={option}
                label={t(`journey.visibility.${option}`)}
                selected={v.visibility === option}
                onPress={() => set('visibility', option)}
              />
            ))}
          </View>
          <Text variant="meta" color="muted">
            {t('journey.form.visibilityHint')}
          </Text>
        </View>
      )}

      {saveError && (
        <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
          {saveError}
        </Text>
      )}
      <Button
        label={t('journey.form.save')}
        icon="check"
        size="lg"
        fullWidth
        loading={saving}
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
