import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  ActionSheet,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Header,
  Icon,
  IconButton,
  Notice,
  Screen,
  Text,
} from '@/components/ds';
import { DocumentRow } from '@/features/backpack/components/DocumentRow';
import {
  useDeleteMilestone,
  useMarkDone,
  useMilestone,
  useMilestoneDocuments,
  useUnlinkDocument,
} from '@/features/journey/api';
import { StampTile } from '@/features/journey/components/StampTile';
import { daysUntil, formatDay, type Milestone } from '@/features/journey/rules';
import { todayIso } from '@/features/profile/places';
import { pushStatus } from '@/lib/notifications';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/journey'));

export default function MilestoneScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const milestone = useMilestone(id);

  if (milestone.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  if (!milestone.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={goBack}
            backLabel={t('common.back')}
            title={t('journey.detail.notFound')}
          />
          <Text variant="body" color="muted">
            {milestone.isError ? t('common.error') : t('journey.detail.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }
  return <MilestoneDetail milestone={milestone.data} />;
}

function MilestoneDetail({ milestone: m }: { milestone: Milestone }) {
  const { t } = useTranslation();
  const remove = useDeleteMilestone();
  const markDone = useMarkDone();
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = m.status === 'done';

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t(`journey.kinds.${m.kind}`)}
          title={m.title}
          right={
            <IconButton
              icon="more"
              accessibilityLabel={t('journey.detail.options')}
              onPress={() => setMenu(true)}
            />
          }
        />

        {done ? (
          <>
            <View style={styles.stamp}>
              <StampTile stamp={m} index={0} size={150} />
            </View>
            <Text variant="meta" color="muted" align="center">
              {t('journey.detail.seenBy', { who: t(`journey.visibility.${m.visibility}`) })}
            </Text>
            <View style={styles.group}>
              <Button
                label={t('journey.detail.share')}
                icon="send"
                fullWidth
                onPress={() => router.push({ pathname: '/compose', params: { milestone: m.id } })}
              />
              <Text variant="meta" color="muted">
                {t('journey.detail.shareHint')}
              </Text>
            </View>
          </>
        ) : (
          <Upcoming
            milestone={m}
            onMarkDone={() => markDone.mutate({ id: m.id, happenedOn: todayIso() })}
            marking={markDone.isPending}
          />
        )}

        {m.notes ? (
          <View style={styles.group}>
            <Text variant="label" color="rust" accessibilityRole="header">
              {t('journey.detail.notes')}
            </Text>
            <Card>
              <Text variant="body">{m.notes}</Text>
            </Card>
          </View>
        ) : null}

        <LinkedDocuments milestoneId={m.id} />

        <View style={styles.privacy}>
          <Icon name="lock" size={18} color="teal" />
          <Text variant="meta" color="muted" style={styles.flex}>
            {t('journey.form.visibilityHint')}
          </Text>
        </View>
      </View>

      <ActionSheet
        visible={menu}
        title={m.title}
        actions={[
          {
            label: t('journey.detail.edit'),
            onPress: () => {
              setMenu(false);
              router.push(`/journey/${m.id}/edit`);
            },
          },
          {
            label: t('journey.detail.delete'),
            destructive: true,
            onPress: () => {
              setMenu(false);
              setConfirmDelete(true);
            },
          },
        ]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setMenu(false)}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title={t('journey.detail.deleteTitle')}
        body={remove.isError ? t('common.error') : t('journey.detail.deleteBody')}
        confirmLabel={t('journey.detail.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(m.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              goBack();
            },
          })
        }
      />
    </Screen>
  );
}

/** Due date, countdown, the reminder and whether it can reach this phone. */
function Upcoming({
  milestone: m,
  onMarkDone,
  marking,
}: {
  milestone: Milestone;
  onMarkDone: () => void;
  marking: boolean;
}) {
  const { t } = useTranslation();
  const push = useQuery({ queryKey: ['push-status'], queryFn: pushStatus });
  const due = m.due_on ?? '';
  const days = daysUntil(due);
  const when =
    days > 0
      ? t('journey.dueIn', { count: days })
      : days === 0
        ? t('journey.dueToday')
        : t('journey.overdue');
  const waiting = !!m.remind_on && !m.reminded_at;

  return (
    <View style={styles.group}>
      <Card flush>
        <Row label={t('journey.form.dueOn')} value={`${formatDay(due)} · ${when}`} />
        {m.remind_on && (
          <>
            <Divider />
            <Row
              label={t('journey.detail.reminder')}
              value={m.reminded_at ? t('journey.reminderSent') : formatDay(m.remind_on)}
            />
          </>
        )}
      </Card>
      {waiting && push.data === 'denied' && (
        <Notice eyebrow={t('journey.detail.reminder')} body={t('journey.detail.pushOff')} />
      )}
      {waiting && push.data === 'unavailable' && (
        <Text variant="meta" color="muted">
          {t('journey.detail.pushUnavailable')}
        </Text>
      )}
      <Button
        label={t('journey.detail.markDone')}
        variant="secondary"
        icon="check"
        fullWidth
        loading={marking}
        onPress={onMarkDone}
      />
    </View>
  );
}

function LinkedDocuments({ milestoneId }: { milestoneId: string }) {
  const { t } = useTranslation();
  const docs = useMilestoneDocuments(milestoneId);
  const unlink = useUnlinkDocument();

  return (
    <View style={styles.group}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('journey.detail.documents')}
      </Text>
      {docs.isPending ? (
        <ActivityIndicator color={colors.navy} />
      ) : (docs.data ?? []).length === 0 ? (
        <Card>
          <Text variant="body" color="muted">
            {docs.isError ? t('common.error') : t('journey.detail.noDocuments')}
          </Text>
        </Card>
      ) : (
        <Card flush>
          {(docs.data ?? []).map((doc, i) => (
            <View key={doc.id}>
              {i > 0 && <Divider />}
              <DocumentRow
                doc={doc}
                onPress={() => router.push(`/document/${doc.id}`)}
                right={
                  <IconButton
                    icon="close"
                    accessibilityLabel={t('journey.detail.unlinkA11y', { name: doc.name })}
                    onPress={() => unlink.mutate({ milestoneId, documentId: doc.id })}
                  />
                }
              />
            </View>
          ))}
        </Card>
      )}
      <Button
        label={t('journey.detail.linkDocument')}
        variant="secondary"
        icon="attach"
        fullWidth
        onPress={() => router.push(`/journey/${milestoneId}/documents`)}
      />
      <Text variant="meta" color="muted">
        {t('journey.detail.documentsHint')}
      </Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <Text variant="body" style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  group: { gap: space[3] },
  flex: { flex: 1 },
  stamp: { alignItems: 'center', paddingVertical: space[2] },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  rowValue: { flexShrink: 1, textAlign: 'right' },
});
