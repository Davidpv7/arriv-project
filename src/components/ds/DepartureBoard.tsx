import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, typography } from '@/theme/tokens';

import { Text } from './Text';

const NAME_MAX = 20;
const GATE_W = 54;
const STATUS_W = 84;

export type DepartureBoardProps = {
  columns: { crew: string; gate: string; status: string };
  accessibilityLabel: string;
  children: ReactNode;
};

/** Navy departures board that holds DepartureRows. */
export function DepartureBoard({ columns, accessibilityLabel, children }: DepartureBoardProps) {
  return (
    <View style={styles.board} accessibilityLabel={accessibilityLabel} accessibilityRole="list">
      <View
        style={[styles.row, styles.header]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text variant="label" color="onNavyMuted" style={styles.flex}>
          {columns.crew}
        </Text>
        <Text variant="label" color="onNavyMuted" style={styles.gate}>
          {columns.gate}
        </Text>
        <Text variant="label" color="onNavyMuted" style={styles.status}>
          {columns.status}
        </Text>
      </View>
      {children}
    </View>
  );
}

export type DepartureRowProps = {
  name: string;
  /** City code, or AU for Australia-wide. */
  gate: string;
  joined: boolean;
  /** Visible status words, e.g. "JOINED" / "BOARD" (from i18n). */
  statusLabel: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  isLast?: boolean;
};

/** One community on the departures board. The whole row links to the community. */
export function DepartureRow({
  name,
  gate,
  joined,
  statusLabel,
  onPress,
  accessibilityLabel,
  isLast,
}: DepartureRowProps) {
  const shown = name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? `${name}, ${gate}, ${statusLabel}`}
      style={({ pressed }) => [
        styles.row,
        styles.item,
        !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.cell, styles.flex]} numberOfLines={1}>
        {shown}
      </Text>
      <Text style={[styles.cell, styles.gate]}>{gate}</Text>
      <View style={styles.status}>
        {joined ? (
          <Text style={[styles.cell, styles.joined]}>{statusLabel}</Text>
        ) : (
          <View style={styles.boardChip}>
            <Text style={[styles.cell, styles.boardChipText]}>{statusLabel}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: space[2],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: 6 },
  header: { paddingBottom: space[2] },
  item: { minHeight: 54 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.boardDivider },
  cell: { ...typography.labelLg, fontSize: 14, color: colors.sunshine },
  gate: { width: GATE_W },
  status: { width: STATUS_W, alignItems: 'flex-end', textAlign: 'right' },
  joined: { color: colors.boardGreen },
  boardChip: {
    backgroundColor: colors.tangerine,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  boardChipText: { color: colors.navy },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
});
