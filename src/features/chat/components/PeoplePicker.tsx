import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Divider, Icon, Input, ListRow, Text } from '@/components/ds';
import { useMyConnections, usePeopleSearch, type ConnectionPerson } from '@/features/profile/api';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

type Props = {
  /** Single: tap a person to pick them. Multi: tap to toggle. */
  mode: 'single' | 'multi';
  selected?: ReadonlySet<string>;
  onPick: (person: ConnectionPerson) => void;
  /** People to leave out (already in the group). */
  exclude?: ReadonlySet<string>;
};

/** Connections by default; search everyone by name or @handle. */
export function PeoplePicker({ mode, selected, onPick, exclude }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const connections = useMyConnections();
  const search = usePeopleSearch(query);
  const searching = query.trim().replace(/^@/, '').length >= 2;

  const source = searching
    ? (search.data ?? [])
    : (connections.data ?? []).filter((c) => c.status === 'accepted').map((c) => c.person);
  const people = source.filter((p) => !exclude?.has(p.id));
  const loading = searching ? search.isPending : connections.isPending;

  return (
    <View style={styles.stack}>
      <Input
        label={t('chat.new.search')}
        placeholder={t('chat.new.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      <Text variant="label" color="rust" accessibilityRole="header">
        {searching ? t('chat.new.results') : t('chat.new.yourConnections')}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.navy} />
      ) : people.length === 0 ? (
        <Card>
          <Text variant="body" color="muted">
            {searching ? t('chat.new.noResults') : t('chat.new.noConnections')}
          </Text>
        </Card>
      ) : (
        <Card flush>
          {people.map((p, i) => {
            const isSelected = !!selected?.has(p.id);
            return (
              <View key={p.id}>
                {i > 0 && <Divider />}
                <ListRow
                  title={p.display_name}
                  meta={`@${p.handle}${p.city ? ` · ${p.city}` : ''}`}
                  avatar={{ initials: initials(p.display_name), uri: avatarUrl(p.avatar_path) }}
                  onPress={() => onPick(p)}
                  accessibilityLabel={
                    mode !== 'multi'
                      ? p.display_name
                      : isSelected
                        ? t('chat.new.selectedA11y', { name: p.display_name })
                        : t('chat.new.selectA11y', { name: p.display_name })
                  }
                  right={
                    mode === 'multi' ? (
                      <View style={[styles.check, isSelected && styles.checkOn]}>
                        {isSelected && <Icon name="check" size={18} />}
                      </View>
                    ) : undefined
                  }
                />
              </View>
            );
          })}
        </Card>
      )}
      {(search.isError || connections.isError) && (
        <Text variant="meta" color="rust">
          {t('common.error')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[3] },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.tangerine, borderColor: colors.tangerine },
});
