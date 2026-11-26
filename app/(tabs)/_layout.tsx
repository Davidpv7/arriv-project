import { router, Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform } from 'react-native';

import { TabBar, type TabKey } from '@/components/ds';
import { useInboxRealtime, useMyGroupInvites, useUnreadTotal } from '@/features/chat/api';
import { useNotificationsRealtime } from '@/features/notifications/api';
import { usePushNotifications } from '@/lib/notifications';
import { colors } from '@/theme/tokens';

type TabBarRenderProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type StackTab = Exclude<TabKey, 'create'>;

// Each tab is a group with its own stack: (home,communities,chat,backpack)/_layout.tsx.
const ROUTE_TO_TAB: Record<string, StackTab> = {
  '(home)': 'home',
  '(communities)': 'communities',
  '(chat)': 'chat',
  '(backpack)': 'backpack',
};
const TAB_TO_ROUTE: Record<StackTab, string> = {
  home: '(home)',
  communities: '(communities)',
  chat: '(chat)',
  backpack: '(backpack)',
};

/** Android resizes the window for the keyboard, which would lift the bar above it. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

function AppTabBar({ state, emitter, navigateToTab }: TabBarRenderProps) {
  const { t } = useTranslation();
  const keyboardVisible = useKeyboardVisible();
  const unread = useUnreadTotal();
  const invites = useMyGroupInvites();
  useInboxRealtime(); // keeps the inbox (and this dot) live on every tab
  useNotificationsRealtime(); // and the Home bell
  if (keyboardVisible) return null;

  const focused = state.routes[state.index];
  const current = ROUTE_TO_TAB[focused?.name ?? ''] ?? 'home';

  return (
    <TabBar
      active={current}
      labels={{
        home: t('tabs.home'),
        communities: t('tabs.communities'),
        create: t('tabs.create'),
        chat: t('tabs.chat'),
        backpack: t('tabs.backpack'),
      }}
      dots={{ chat: unread > 0 || (invites.data?.length ?? 0) > 0 }}
      dotLabel={t('tabs.unreadDot')}
      onPress={(key) => {
        if (key === 'create') {
          router.push('/compose'); // opens the composer modal over the current tab
          return;
        }
        const route = state.routes.find((r) => r.name === TAB_TO_ROUTE[key]);
        if (!route) return;
        // The tab's stack listens for this: on the active tab it pops back to the top.
        const event = emitter.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (route.key !== focused?.key && !event.defaultPrevented) navigateToTab(route.key);
      }}
    />
  );
}

export const unstable_settings = { anchor: '(home)' };

export default function TabsLayout() {
  usePushNotifications(); // signed in from here on
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(communities)" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="(chat)" />
      <Tabs.Screen name="(backpack)" />
    </Tabs>
  );
}
