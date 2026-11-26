import { router, Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform } from 'react-native';

import { Sidebar, TabBar, useIsWide, type TabKey } from '@/components/ds';
import { useInboxRealtime, useMyGroupInvites, useUnreadTotal } from '@/features/chat/api';
import { useNotificationsRealtime, useUnreadNotificationCount } from '@/features/notifications/api';
import { useMyProfile } from '@/features/profile/api';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
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
  const wide = useIsWide();
  const keyboardVisible = useKeyboardVisible();
  const unread = useUnreadTotal();
  const invites = useMyGroupInvites();
  const notifications = useUnreadNotificationCount().data ?? 0;
  const me = useMyProfile().data;
  useInboxRealtime(); // keeps the inbox (and this dot) live on every tab
  useNotificationsRealtime(); // and the Home bell
  if (keyboardVisible && !wide) return null;

  const focused = state.routes[state.index];
  const current = ROUTE_TO_TAB[focused?.name ?? ''] ?? 'home';
  const chatDot = unread > 0 || (invites.data?.length ?? 0) > 0;

  const goToTab = (key: StackTab) => {
    const route = state.routes.find((r) => r.name === TAB_TO_ROUTE[key]);
    if (!route) return;
    // The tab's stack listens for this: on the active tab it pops back to the top.
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (route.key !== focused?.key && !event.defaultPrevented) navigateToTab(route.key);
  };

  if (wide) {
    return (
      <Sidebar
        active={current}
        appName={t('common.appName')}
        logo={require('@/assets/images/icon.png') as number}
        labels={{
          home: t('tabs.home'),
          communities: t('tabs.communities'),
          chat: t('tabs.chat'),
          backpack: t('tabs.backpack'),
          create: t('tabs.newPostcard'),
          notifications: t('notifications.title'),
          settings: t('settings.title'),
        }}
        dots={{ chat: chatDot }}
        dotLabel={t('tabs.unreadDot')}
        notificationCount={notifications}
        notificationCountLabel={t('notifications.openUnread', { count: notifications })}
        onPress={goToTab}
        onCreate={() => router.push('/compose')}
        onNotifications={() => router.push('/notifications')}
        onSettings={() => router.push('/settings')}
        me={
          me
            ? {
                name: me.display_name,
                handle: me.handle,
                initials: initials(me.display_name),
                avatarUri: avatarUrl(me.avatar_path),
                onPress: () => router.push(`/profile/${me.handle}`),
              }
            : undefined
        }
      />
    );
  }

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
      dots={{ chat: chatDot }}
      dotLabel={t('tabs.unreadDot')}
      onPress={(key) => {
        if (key === 'create') {
          router.push('/compose'); // opens the composer modal over the current tab
          return;
        }
        goToTab(key);
      }}
    />
  );
}

export const unstable_settings = { anchor: '(home)' };

export default function TabsLayout() {
  usePushNotifications(); // signed in from here on
  const wide = useIsWide();
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
        // Desktop: the navigation becomes a sidebar on the left.
        tabBarPosition: wide ? 'left' : 'bottom',
      }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(communities)" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="(chat)" />
      <Tabs.Screen name="(backpack)" />
    </Tabs>
  );
}
