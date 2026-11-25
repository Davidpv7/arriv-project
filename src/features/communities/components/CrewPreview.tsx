import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { DepartureBoard, DepartureRow, Stamp, Text } from '@/components/ds';
import { communityInitials, gateCode, type StampColor } from '@/features/feed/format';
import { space } from '@/theme/tokens';

/** Big stamp for the crew being made; updates as the person types. */
export function CrewStamp({ name, color }: { name: string; color: StampColor }) {
  return (
    <View
      style={styles.stamp}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Stamp label={communityInitials(name.trim() || 'Crew')} size="lg" fill={color} tilt="md" />
    </View>
  );
}

/** The crew as it will appear on the departures board. */
export function CrewBoardPreview({ name, city }: { name: string; city: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.board}>
      <Text variant="label" color="muted">
        {t('communities.wizard.stamp.preview')}
      </Text>
      <DepartureBoard
        accessibilityLabel={t('communities.wizard.stamp.preview')}
        columns={{ crew: t('board.crew'), gate: t('board.gate'), status: t('board.status') }}
      >
        <DepartureRow
          name={name.trim()}
          gate={gateCode(city || null)}
          joined
          statusLabel={t('board.joined')}
          isLast
        />
      </DepartureBoard>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: { alignItems: 'center', paddingVertical: space[4] },
  board: { gap: space[2] },
});
