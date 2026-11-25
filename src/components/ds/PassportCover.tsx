import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Text } from './Text';

export type PassportCoverProps = {
  /** DM Mono eyebrow, e.g. "PASSPORT · ARRIV". */
  eyebrow: string;
  name: string;
  handle: string;
  initials: string;
  avatarUri?: string | null;
  /** e.g. "BRA → AUS". */
  route?: string;
  /** e.g. "SINCE MAR 2025". */
  since?: string;
  bio?: string | null;
  children?: ReactNode;
};

/** Profile header styled as a navy passport cover. */
export function PassportCover({
  eyebrow,
  name,
  handle,
  initials,
  avatarUri,
  route,
  since,
  bio,
  children,
}: PassportCoverProps) {
  return (
    <View style={styles.cover}>
      <Text variant="label" color="onNavyMuted">
        {eyebrow}
      </Text>
      <View style={styles.identity}>
        <View style={styles.photo}>
          <Avatar initials={initials} uri={avatarUri} size={76} fill="sky" />
        </View>
        <View style={styles.names}>
          <Text variant="heading" color="onNavy" style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text variant="meta" color="onNavyMuted">
            @{handle}
          </Text>
          {route ? (
            <Text variant="labelLg" color="sunshine" style={styles.route}>
              {route}
            </Text>
          ) : null}
          {since ? (
            <Text variant="label" color="onNavyMuted">
              {since}
            </Text>
          ) : null}
        </View>
      </View>
      {bio ? (
        <Text variant="body" color="onNavy">
          {bio}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: space[5],
    gap: space[4],
  },
  identity: { flexDirection: 'row', gap: space[4], alignItems: 'center' },
  photo: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.sunshine,
  },
  names: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.sans900, fontSize: 24, lineHeight: 28 },
  route: { fontSize: 16, letterSpacing: 1, marginTop: space[1] },
});
