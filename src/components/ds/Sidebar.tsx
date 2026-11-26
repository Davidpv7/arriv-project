import { Image, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import type { TabKey } from './TabBar';
import { Text } from './Text';

type NavKey = Exclude<TabKey, 'create'>;

const ICONS: Record<NavKey, IconName> = {
  home: 'home',
  communities: 'communities',
  chat: 'chat',
  backpack: 'backpack',
};
const ORDER: NavKey[] = ['home', 'communities', 'chat', 'backpack'];

export type SidebarProps = {
  active: NavKey | null;
  labels: Record<NavKey, string> & { create: string; notifications: string; settings: string };
  onPress: (key: NavKey) => void;
  onCreate: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  /** Sections with something new (e.g. unread messages) show a sunshine dot. */
  dots?: Partial<Record<NavKey, boolean>>;
  dotLabel?: string;
  /** Unread notifications (0 hides the count). */
  notificationCount?: number;
  /** Screen-reader text for the count, e.g. "3 unread". */
  notificationCountLabel?: string;
  me?: {
    name: string;
    handle: string;
    initials: string;
    avatarUri?: string | null;
    onPress: () => void;
  };
  /** The app icon image (assets/images/icon.png). */
  logo: number;
  appName: string;
};

/**
 * Desktop navigation (wide screens): the same sections as the bottom TabBar, plus
 * create, notifications, settings and me. Navy, active item as a tangerine pill.
 */
export function Sidebar({
  active,
  labels,
  onPress,
  onCreate,
  onNotifications,
  onSettings,
  dots,
  dotLabel,
  notificationCount = 0,
  notificationCountLabel,
  me,
  logo,
  appName,
}: SidebarProps) {
  return (
    <View style={styles.side} accessibilityRole="tablist">
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.brandName} color="onNavy">
          {appName}
        </Text>
      </View>

      {ORDER.map((key) => {
        const on = active === key;
        const dot = !!dots?.[key];
        return (
          <Pressable
            key={key}
            onPress={() => onPress(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={dot && dotLabel ? `${labels[key]}, ${dotLabel}` : labels[key]}
            style={({ pressed, hovered }) => [
              styles.item,
              on ? styles.itemOn : hovered && styles.itemHover,
              pressed && styles.pressed,
            ]}
          >
            <View>
              <Icon name={ICONS[key]} color={on ? 'navy' : 'onNavy'} />
              {dot && <View style={styles.dot} />}
            </View>
            <Text style={styles.itemLabel} color={on ? 'navy' : 'onNavy'}>
              {labels[key]}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel={labels.create}
        style={({ pressed, hovered }) => [
          styles.create,
          (hovered || pressed) && styles.createHover,
        ]}
      >
        <View style={styles.createInner}>
          <Icon name="plus" size={20} />
          <Text style={styles.itemLabel}>{labels.create}</Text>
        </View>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable
        onPress={onNotifications}
        accessibilityRole="button"
        accessibilityLabel={
          notificationCount > 0 && notificationCountLabel
            ? `${labels.notifications}, ${notificationCountLabel}`
            : labels.notifications
        }
        style={({ pressed, hovered }) => [
          styles.item,
          hovered && styles.itemHover,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="bell" color="onNavy" />
        <Text style={[styles.itemLabel, styles.flex]} color="onNavy">
          {labels.notifications}
        </Text>
        {notificationCount > 0 && (
          <View style={styles.count}>
            <RNText style={styles.countText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </RNText>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel={labels.settings}
        style={({ pressed, hovered }) => [
          styles.item,
          hovered && styles.itemHover,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="settings" color="onNavy" />
        <Text style={styles.itemLabel} color="onNavy">
          {labels.settings}
        </Text>
      </Pressable>

      {me && (
        <Pressable
          onPress={me.onPress}
          accessibilityRole="link"
          accessibilityLabel={me.name}
          style={({ pressed, hovered }) => [styles.me, (hovered || pressed) && styles.itemHover]}
        >
          <Avatar initials={me.initials} uri={me.avatarUri} size={40} fill="sky" />
          <View style={styles.flex}>
            <Text style={styles.meName} color="onNavy" numberOfLines={1}>
              {me.name}
            </Text>
            <Text variant="meta" color="onNavyMuted" numberOfLines={1}>
              @{me.handle}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    width: 252,
    backgroundColor: colors.navy,
    paddingVertical: space[6],
    paddingHorizontal: 18,
    gap: space[1],
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[2],
    paddingBottom: space[5],
  },
  logo: { width: 38, height: 38, borderRadius: 9 },
  brandName: { fontFamily: fonts.sans900, fontSize: 26, lineHeight: 30 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
  },
  itemOn: { backgroundColor: colors.tangerine },
  itemHover: { backgroundColor: colors.boardDivider },
  itemLabel: { fontFamily: fonts.sans900, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.85 },
  dot: {
    position: 'absolute',
    right: -3,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.sunshine,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  create: {
    marginTop: space[5],
    marginHorizontal: space[1],
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.sunshine,
  },
  createHover: { opacity: 0.9 },
  createInner: {
    flexDirection: 'row',
    gap: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderStyle: 'dotted',
    borderColor: colors.navy,
  },
  spacer: { flex: 1 },
  flex: { flex: 1 },
  count: {
    backgroundColor: colors.tangerine,
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: { color: colors.navy, fontFamily: fonts.sans900, fontSize: 12 },
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[2],
    padding: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.boardDivider,
    borderRadius: radius.ticket,
  },
  meName: { fontFamily: fonts.sans700, fontSize: 15, lineHeight: 19 },
});
