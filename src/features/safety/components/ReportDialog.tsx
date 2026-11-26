import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button, ChoiceList, Input, Text } from '@/components/ds';
import {
  REPORT_REASONS,
  useReport,
  type ReportReason,
  type ReportTarget,
} from '@/features/safety/api';
import { colors, radius, space } from '@/theme/tokens';

export type ReportDialogProps = {
  /** What to report; null closes the dialog. */
  target: { type: ReportTarget; id: string } | null;
  onClose: () => void;
};

/** Report a post, comment, message, person or community: a reason, optional details, send. */
export function ReportDialog({ target, onClose }: ReportDialogProps) {
  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      {/* Mounted only while open, so each report starts fresh. */}
      {target && <ReportBody target={target} onClose={onClose} />}
    </Modal>
  );
}

function ReportBody({
  target,
  onClose,
}: {
  target: { type: ReportTarget; id: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t('common.cancel')}>
        <Pressable style={styles.card} accessibilityViewIsModal>
          {report.isSuccess ? (
            <View style={styles.stack}>
              <Text variant="heading" accessibilityRole="header">
                {t('report.thanksTitle')}
              </Text>
              <Text variant="body">{t('report.thanksBody')}</Text>
              <Button label={t('common.done')} fullWidth onPress={onClose} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.stack} keyboardShouldPersistTaps="handled">
              <Text variant="heading" accessibilityRole="header">
                {t(`report.title.${target.type}`)}
              </Text>
              <ChoiceList
                accessibilityLabel={t('report.reason')}
                value={reason}
                onChange={setReason}
                options={REPORT_REASONS.map((r) => ({
                  value: r,
                  label: t(`report.reasons.${r}`),
                }))}
              />
              <Input
                label={t('report.details')}
                placeholder={t('report.detailsPlaceholder')}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={1000}
              />
              <Text variant="meta" color="muted">
                {target.type === 'message' ? t('report.messageNote') : t('report.note')}
              </Text>
              {report.isError && (
                <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
                  {t('common.error')}
                </Text>
              )}
              <View style={styles.actions}>
                <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
                <Button
                  label={t('report.send')}
                  loading={report.isPending}
                  onPress={() =>
                    report.mutate({ targetType: target.type, targetId: target.id, reason, details })
                  }
                />
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[5],
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderRadius: radius.ticket,
    padding: space[5],
  },
  stack: { gap: space[3] },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[2],
  },
});
