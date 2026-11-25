import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Header, ListRow, Screen, Text } from '@/components/ds';
import {
  useAcceptConnection,
  useMyConnections,
  useRemoveConnection,
  type ConnectionRow,
} from '@/features/profile/api';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

export default function Connections() {
  const { t } = useTranslation();
  const { data, isPending, isError } = useMyConnections();
  const accept = useAcceptConnection();
  const remove = useRemoveConnection();

  const incoming = (data ?? []).filter((c) => c.status === 'pending' && c.direction === 'incoming');
  const outgoing = (data ?? []).filter((c) => c.status === 'pending' && c.direction === 'outgoing');
  const connected = (data ?? []).filter((c) => c.status === 'accepted');

  const row = (c: ConnectionRow, meta: string | undefined, actions?: ReactNode) => (
    <>
      <ListRow
        title={c.person.display_name}
        meta={meta ?? `@${c.person.handle}${c.person.city ? ` · ${c.person.city}` : ''}`}
        avatar={{ initials: initials(c.person.display_name), uri: avatarUrl(c.person.avatar_path) }}
        onPress={() => router.push(`/profile/${c.person.handle}`)}
      />
      {actions}
    </>
  );

  const section = (title: string, rows: ReactNode[]) =>
    rows.length > 0 && (
      <View style={styles.section}>
        <Text variant="label" color="rust" accessibilityRole="header">
          {title}
        </Text>
        <Card flush>
          {rows.map((r, i) => (
            <View key={i}>
              {i > 0 && <Divider />}
              {r}
            </View>
          ))}
        </Card>
      </View>
    );

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          backLabel={t('common.back')}
          title={t('connections.title')}
        />
        {isPending && <ActivityIndicator color={colors.navy} />}
        {isError && <Text variant="body">{t('common.error')}</Text>}

        {section(
          t('connections.requests'),
          incoming.map((c) =>
            row(
              c,
              t('connections.incomingMeta'),
              <View style={styles.actions}>
                <Button
                  label={t('profile.accept')}
                  disabled={accept.isPending}
                  onPress={() => accept.mutate(c.person.id)}
                />
                <Button
                  label={t('profile.decline')}
                  variant="secondary"
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(c.person.id)}
                />
              </View>,
            ),
          ),
        )}
        {section(
          t('connections.connected'),
          connected.map((c) => row(c, undefined)),
        )}
        {section(
          t('connections.sent'),
          outgoing.map((c) => row(c, t('connections.outgoingMeta'))),
        )}

        {data && data.length === 0 && (
          <Card>
            <Text variant="body" color="muted">
              {t('connections.empty')}
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    backgroundColor: colors.card,
  },
});
