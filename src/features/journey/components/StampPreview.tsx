import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useNewStamp } from '@/features/journey/newStampStore';
import { space } from '@/theme/tokens';

import { StampTile } from './StampTile';

/** The stamp being made in the wizard, updating as answers change. */
export function StampPreview() {
  const { t } = useTranslation();
  const s = useNewStamp();
  const title = s.title.trim() || t(`journey.kinds.${s.kind}`);
  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <StampTile
        index={0}
        size={120}
        stamp={{
          kind: s.kind,
          title,
          happened_on: s.status === 'done' ? s.happenedOn : s.dueOn,
          visa_subclass: /^\d{3}$/.test(s.visaSubclass.trim()) ? s.visaSubclass.trim() : null,
          place: s.place.trim() || null,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: space[2] },
});
