import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  DepartureBoard,
  DepartureRow,
  Input,
  Screen,
  Text,
} from '@/components/ds';
import { useCommunities, useMyMemberships, type CommunityFilter } from '@/features/communities/api';
import { useNewCrew } from '@/features/communities/newCrewStore';
import { gateCode } from '@/features/feed/format';
import { useMyProfile } from '@/features/profile/api';
import { colors, space } from '@/theme/tokens';

const FILTERS: CommunityFilter[] = ['all', 'near', 'visa', 'joined'];

/** Communities as a departures board: search, filter, then open a crew. */
export default function Departures() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CommunityFilter>('all');
  const resetNewCrew = useNewCrew((s) => s.reset);
  const profile = useMyProfile();
  const memberships = useMyMemberships();
  const joinedIds = [...(memberships.data?.keys() ?? [])];
  const list = useCommunities(search, filter, {
    city: profile.data?.city ?? null,
    visa: profile.data?.visa?.visa_subclass ?? null,
    joinedIds,
  });

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="label" color="rust">
              {t('communities.eyebrow')}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {t('communities.title')}
            </Text>
          </View>
          <Button
            label={t('communities.newCrew')}
            variant="dark"
            icon="plus"
            onPress={() => {
              resetNewCrew();
              router.push('/new-crew/name');
            }}
          />
        </View>

        <Input
          label={t('communities.search')}
          value={search}
          onChangeText={setSearch}
          placeholder={t('communities.searchPlaceholder')}
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={styles.filters} accessibilityRole="radiogroup">
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={t(`communities.filters.${f}`)}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </View>

        {list.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : list.isError ? (
          <Text variant="body">{t('common.error')}</Text>
        ) : list.data.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {filter === 'visa' && !profile.data?.visa?.visa_subclass
                ? t('communities.emptyVisa')
                : t('communities.empty')}
            </Text>
          </Card>
        ) : (
          <DepartureBoard
            accessibilityLabel={t('communities.boardLabel')}
            columns={{ crew: t('board.crew'), gate: t('board.gate'), status: t('board.status') }}
          >
            {list.data.map((c, i) => {
              const joined = memberships.data?.has(c.id) ?? false;
              return (
                <DepartureRow
                  key={c.id}
                  name={c.name}
                  gate={gateCode(c.city)}
                  joined={joined}
                  statusLabel={joined ? t('board.joined') : t('board.boardAction')}
                  isLast={i === list.data.length - 1}
                  onPress={() => router.push(`/community/${c.slug}`)}
                  accessibilityLabel={`${c.name}, ${t('communities.gate', { code: gateCode(c.city) })}, ${t('communities.onBoard', { count: c.member_count })}, ${joined ? t('board.joined') : t('board.boardAction')}`}
                />
              );
            })}
          </DepartureBoard>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  flex: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
