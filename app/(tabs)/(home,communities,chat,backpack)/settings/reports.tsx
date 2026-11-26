import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Header,
  ListScreen,
  Notice,
  Text,
} from '@/components/ds';
import { relativeTime } from '@/features/feed/format';
import {
  useIsAdmin,
  useResolveReport,
  useReviewReports,
  type ReviewReport,
} from '@/features/safety/api';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

/** Admin review: open reports first come, first served; remove the content or dismiss. */
export default function ReportsScreen() {
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const reports = useReviewReports(tab);
  const resolve = useResolveReport();
  const [removing, setRemoving] = useState<ReviewReport | null>(null);

  const items = reports.data ?? [];

  return (
    <>
      <ListScreen<ReviewReport>
        data={isAdmin ? items : []}
        keyExtractor={(r) => r.id}
        refreshing={reports.isRefetching}
        onRefresh={() => void reports.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Header
              onBack={goBack}
              backLabel={t('common.back')}
              eyebrow={t('admin.eyebrow')}
              title={t('admin.title')}
            />
            <View style={styles.tabs} accessibilityRole="radiogroup">
              {(['open', 'closed'] as const).map((k) => (
                <Chip
                  key={k}
                  label={t(`admin.${k}`)}
                  selected={tab === k}
                  onPress={() => setTab(k)}
                />
              ))}
            </View>
            {reports.isPending && isAdmin && <ActivityIndicator color={colors.navy} />}
            {(reports.isError || resolve.isError) && (
              <Text variant="meta" color="rust">
                {t('common.error')}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            busy={resolve.isPending && resolve.variables?.id === item.id}
            onRemove={() => setRemoving(item)}
            onDismiss={() => resolve.mutate({ id: item.id, remove: false })}
          />
        )}
        ListEmptyComponent={
          !isAdmin || reports.isSuccess ? (
            <Card>
              <Text variant="body" color="muted">
                {!isAdmin
                  ? t('common.notFound')
                  : tab === 'open'
                    ? t('admin.emptyOpen')
                    : t('admin.emptyClosed')}
              </Text>
            </Card>
          ) : undefined
        }
      />
      <ConfirmDialog
        visible={!!removing}
        title={t('admin.removeTitle', {
          thing: removing ? t(`admin.targets.${removing.target_type}`).toLowerCase() : '',
        })}
        body={
          removing?.target_type === 'community'
            ? t('admin.removeCommunityBody')
            : t('admin.removeBody')
        }
        confirmLabel={t('admin.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={resolve.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          resolve.mutate({ id: removing.id, remove: true }, { onSuccess: () => setRemoving(null) })
        }
      />
    </>
  );
}

function ReportCard({
  report: r,
  busy,
  onRemove,
  onDismiss,
}: {
  report: ReviewReport;
  busy: boolean;
  onRemove: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const snap = (r.snapshot ?? {}) as Record<string, string | null | undefined>;
  const open = r.status === 'open';

  // What was reported, as the database saw it when reported.
  const quoted =
    r.target_type === 'profile'
      ? [snap.display_name, snap.handle ? `@${snap.handle}` : null, snap.bio]
      : r.target_type === 'community'
        ? [snap.name, snap.description]
        : [
            snap.body,
            snap.attachment_name ? t('admin.attachment', { name: snap.attachment_name }) : null,
          ];

  const link =
    r.target_type === 'post'
      ? { label: t('admin.viewPost'), go: () => router.push(`/post/${r.target_id}`) }
      : r.target_type === 'comment' && snap.post_id
        ? { label: t('admin.viewPost'), go: () => router.push(`/post/${snap.post_id}`) }
        : r.target_type === 'profile' && snap.handle
          ? { label: t('admin.viewProfile'), go: () => router.push(`/profile/${snap.handle}`) }
          : r.target_type === 'community' && snap.slug
            ? {
                label: t('admin.viewCommunity'),
                go: () => router.push(`/community/${snap.slug}`),
              }
            : null;

  return (
    <Card>
      <View style={styles.card}>
        <Text variant="label" color="rust">
          {`${t(`admin.targets.${r.target_type}`)} · ${t(`report.reasons.${r.reason as 'spam'}`)}${
            open ? '' : ` · ${t(`admin.statuses.${r.status}`)}`
          }`}
        </Text>
        <View style={styles.quote}>
          {quoted.filter(Boolean).map((line, i) => (
            <Text key={i} variant={i === 0 ? 'body' : 'meta'} color={i === 0 ? 'navy' : 'muted'}>
              {line}
            </Text>
          ))}
        </View>
        {r.details ? <Text variant="meta">{`“${r.details}”`}</Text> : null}
        <Text variant="meta" color="muted">
          {t('admin.by', {
            name: r.reporter?.display_name ?? t('admin.unknown'),
            when: relativeTime(t, r.created_at),
          })}
        </Text>
        {r.target_user && r.target_type !== 'profile' && (
          <Text variant="meta" color="muted">
            {t('admin.about', { name: `${r.target_user.display_name} (@${r.target_user.handle})` })}
          </Text>
        )}
        {open && r.target_type === 'profile' && (
          <Notice eyebrow={t('admin.reports')} body={t('admin.profileNote')} tone="sky" />
        )}
        {open && (
          <View style={styles.actions}>
            {r.target_type !== 'profile' && (
              <Button label={t('admin.remove')} variant="dark" onPress={onRemove} disabled={busy} />
            )}
            <Button
              label={t('admin.dismiss')}
              variant="secondary"
              onPress={onDismiss}
              loading={busy}
            />
            {link && <Button label={link.label} variant="secondary" onPress={link.go} />}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[4], marginBottom: space[4] },
  tabs: { flexDirection: 'row', gap: space[2] },
  card: { gap: space[2] },
  quote: {
    gap: space[1],
    borderLeftWidth: 3,
    borderLeftColor: colors.rule,
    paddingLeft: space[3],
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
});
