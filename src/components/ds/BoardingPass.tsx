import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius, shadow, space } from '@/theme/tokens';

import { DashedLine } from './DashedLine';
import { Icon } from './Icon';
import { Text } from './Text';

export type BoardingPassStop = { code: string; city?: string };
export type BoardingPassField = { label: string; value: string };

export type BoardingPassProps = {
  eyebrowStart: string;
  eyebrowEnd?: string;
  name?: string;
  from: BoardingPassStop;
  to: BoardingPassStop;
  /** Keep to three fields. */
  fields: [BoardingPassField, BoardingPassField?, BoardingPassField?];
  /** Colour behind the pass: notches are cut in it. `navy` on Welcome. */
  background?: 'paper' | 'navy';
  /** Plane on the route line (Home). */
  showPlane?: boolean;
  accessibilityLabel?: string;
};

const NOTCH = 22;

/** The user's journey summary ticket: route, then a perforated stub with three fields. */
export function BoardingPass({
  eyebrowStart,
  eyebrowEnd,
  name,
  from,
  to,
  fields,
  background = 'paper',
  showPlane = false,
  accessibilityLabel,
}: BoardingPassProps) {
  const [perfY, setPerfY] = useState<number | null>(null);
  const stub = fields.filter((f): f is BoardingPassField => !!f).slice(0, 3);

  return (
    <View
      style={styles.pass}
      accessible
      accessibilityLabel={
        accessibilityLabel ??
        [name, `${from.code} → ${to.code}`, ...stub.map((f) => `${f.label} ${f.value}`)]
          .filter(Boolean)
          .join(', ')
      }
    >
      <View style={styles.top} onLayout={(e) => setPerfY(e.nativeEvent.layout.height)}>
        <View style={styles.eyebrow}>
          <Text variant="label" color="rust">
            {eyebrowStart}
          </Text>
          {eyebrowEnd ? (
            <Text variant="label" color="rust">
              {eyebrowEnd}
            </Text>
          ) : null}
        </View>
        {name ? (
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
        <View style={styles.route}>
          <View>
            <Text style={styles.code}>{from.code}</Text>
            {from.city ? (
              <Text variant="meta" color="muted">
                {from.city}
              </Text>
            ) : null}
          </View>
          <View style={styles.routeLine}>
            <DashedLine color="navy" style={styles.flex} />
            {showPlane && (
              <View style={styles.plane}>
                <Icon name="plane" size={22} />
              </View>
            )}
            {showPlane && <DashedLine color="navy" style={styles.flex} />}
          </View>
          <View style={styles.end}>
            <Text style={styles.code}>{to.code}</Text>
            {to.city ? (
              <Text variant="meta" color="muted" align="right">
                {to.city}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <DashedLine color="perforation" style={styles.perf} />
      {perfY !== null &&
        (['left', 'right'] as const).map((side) => (
          <View
            key={side}
            style={[
              styles.notch,
              { top: perfY + 1 - NOTCH / 2, backgroundColor: colors[background] },
              side === 'left' ? { left: -NOTCH / 2 } : { right: -NOTCH / 2 },
            ]}
          />
        ))}

      <View style={styles.stub}>
        {stub.map((field) => (
          <View key={field.label} style={styles.flex}>
            <Text variant="label" color="muted">
              {field.label}
            </Text>
            <Text style={styles.value} numberOfLines={1}>
              {field.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    ...shadow.paper,
  },
  top: {
    paddingTop: space[4],
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: space[2],
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontFamily: fonts.sans900, fontSize: 18, lineHeight: 22 },
  route: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontFamily: fonts.sans900, fontSize: 36, lineHeight: 38 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: space[3] },
  plane: { transform: [{ rotate: '90deg' }], marginHorizontal: space[1] },
  end: { alignItems: 'flex-end' },
  perf: { marginHorizontal: 14 },
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2 },
  stub: {
    flexDirection: 'row',
    gap: space[2],
    paddingTop: space[3],
    paddingHorizontal: 18,
    paddingBottom: space[4],
  },
  value: { fontFamily: fonts.sans900, fontSize: 16, lineHeight: 20 },
  flex: { flex: 1 },
});
