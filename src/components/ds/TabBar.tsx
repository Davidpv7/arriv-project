import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, rotate } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

export type TabKey = 'home' | 'communities' | 'create' | 'chat' | 'backpack';

const ICONS: Record<Exclude<TabKey, 'create'>, IconName> = {
  home: 'home',
  communities: 'communities',
  chat: 'chat',
  backpack: 'backpack',
};

const ORDER: TabKey[] = ['home', 'communities', 'create', 'chat', 'backpack'];

export type TabBarProps = {
  active: Exclude<TabKey, 'create'>;
  /** Screen-reader labels for every slot (from i18n). */
  labels: Record<TabKey, string>;
  onPress: (key: TabKey) => void;
  /** Render inside a fixed-height preview (DS screen) instead of at the screen edge. */
  ignoreSafeArea?: boolean;
  /** Tabs with something new (e.g. unread messages) show a sunshine dot. */
  dots?: Partial<Record<Exclude<TabKey, 'create'>, boolean>>;
  /** Screen-reader suffix for a tab with a dot, e.g. "unread messages" (from i18n). */
  dotLabel?: string;
};

const PLUS = 62;

/** Navy bottom navigation with the raised centre + stamp. Shown on every screen except full-screen tasks. */
export function TabBar({
  active,
  labels,
  onPress,
  ignoreSafeArea = false,
  dots,
  dotLabel,
}: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = ignoreSafeArea ? 14 : Math.max(14, insets.bottom);

  return (
    <View
      style={[styles.bar, { paddingBottom: bottom, height: 78 + bottom }]}
      accessibilityRole="tablist"
    >
      {ORDER.map((key) => {
        if (key === 'create') {
          return (
            <Pressable
              key={key}
              onPress={() => onPress(key)}
              accessibilityRole="button"
              accessibilityLabel={labels.create}
              style={({ pressed }) => [
                styles.plus,
                { transform: rotate('md', -1) },
                pressed && styles.pressed,
              ]}
            >
              <Svg width={PLUS} height={PLUS} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={PLUS / 2}
                  cy={PLUS / 2}
                  r={PLUS / 2 - 1.5}
                  fill={colors.sunshine}
                  stroke={colors.navy}
                  strokeWidth={3}
                  strokeDasharray="0.01 6"
                  strokeLinecap="round"
                />
              </Svg>
              <View>
                <Icon name="plus" size={28} />
              </View>
            </Pressable>
          );
        }
        const isActive = key === active;
        const dot = !!dots?.[key];
        return (
          <Pressable
            key={key}
            onPress={() => onPress(key)}
            accessibilityRole="tab"
            accessibilityLabel={dot && dotLabel ? `${labels[key]}, ${dotLabel}` : labels[key]}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon name={ICONS[key]} size={26} color={isActive ? 'navy' : 'onNavy'} />
            {dot && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.navy,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tab: { width: 56, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.tangerine },
  plus: {
    width: PLUS,
    height: PLUS,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.sunshine,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  pressed: { opacity: 0.85 },
});
