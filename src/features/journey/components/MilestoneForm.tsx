import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, DateField, Input, SwitchRow, Text } from '@/components/ds';
import {
  canShareStats,
  MILESTONE_KINDS,
  NOTES_MAX,
  PLACE_MAX,
  SUBCLASS_KINDS,
  TITLE_MAX,
  milestoneFormSchema,
  type FormStatus,
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
    const parsed = milestoneFormSchema.safeParse({ ...v, status });
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

  const visa = v.kind === 'visa';
  // "Still waiting" is only for visas.
  const status: FormStatus = !visa && v.status === 'waiting' ? 'done' : v.status;
  const statuses: FormStatus[] = visa ? ['done', 'waiting', 'upcoming'] : ['done', 'upcoming'];
  const statusLabel = {
    done: t(visa ? 'journey.form.statusGranted' : 'journey.form.statusDone'),
    waiting: t('journey.form.statusWaiting'),
    upcoming: t('journey.form.statusUpcoming'),
  };
  const lodgedOn = visa && status !== 'upcoming' ? v.lodgedOn : null;
  const statsAllowed = canShareStats({
    lodged_on: lodgedOn,
    visa_subclass: /^\d{3}$/.test(v.visaSubclass.trim()) ? v.visaSubclass : null,
  });

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
          {statuses.map((st) => (
            <Chip
              key={st}
              label={statusLabel[st]}
              selected={status === st}
              onPress={() => set('status', st)}
            />
          ))}
        </View>
      </View>

      {status === 'done' && (
        <DateField
          label={t(visa ? 'journey.form.grantedOn' : 'journey.form.happenedOn')}
          value={v.happenedOn}
          onChange={(date) => set('happenedOn', date)}
          parts={dateParts}
          error={errorText(errors.happenedOn)}
        />
      )}
      {visa && status !== 'upcoming' && (
        <DateField
          label={t(
            status === 'waiting' ? 'journey.form.lodgedOn' : 'journey.form.lodgedOnOptional',
          )}
          value={v.lodgedOn}
          onChange={(date) => set('lodgedOn', date)}
          parts={dateParts}
          hint={status === 'done' ? t('journey.form.lodgedHint') : undefined}
          error={errorText(errors.lodgedOn)}
        />
      )}
      {status === 'upcoming' && (
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
      {errors.status && (
        <Text variant="meta" color="rust">
          {errorText(errors.status)}
        </Text>
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

      {visa && status !== 'upcoming' && (
        <View style={styles.group}>
          <Card flush>
            <SwitchRow
              label={t('visaStats.switchLabel')}
              description={statsAllowed ? t('visaStats.switchHint') : t('visaStats.switchNeeds')}
              value={v.shareStats && statsAllowed}
              disabled={!statsAllowed}
              onValueChange={(on) => set('shareStats', on)}
            />
          </Card>
        </View>
      )}

      {status !== 'upcoming' && (
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
