import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import { colors, space } from '@/theme/tokens';

import { CommunityView } from './CommunityView';
import { Departures } from './Departures';

type Props = {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

/** Desktop communities: the departures board on the left, the selected crew on the right. */
export function CommunitySplit({ selectedSlug, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.board}>
        <Departures selectedSlug={selectedSlug} onOpen={onSelect} />
      </View>
      <View style={styles.pane}>
        {selectedSlug ? (
          <CommunityView key={selectedSlug} slug={selectedSlug} embedded />
        ) : (
          <View style={styles.empty}>
            <Icon name="communities" size={40} color="muted" />
            <Text variant="heading">{t('communities.pickTitle')}</Text>
            <Text variant="body" color="muted" align="center">
              {t('communities.pickBody')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  board: { width: 500, borderRightWidth: 1, borderRightColor: colors.rule },
  pane: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[6],
  },
});
