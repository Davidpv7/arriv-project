import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { TabBar, type TabKey } from '@/components/ds';
import { colors } from '@/theme/tokens';

type TabBarRenderProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ROUTE_TO_TAB: Record<string, TabKey> = {
  home: 'home',
  communities: 'communities',
  create: 'create',
  chat: 'chat',
  backpack: 'backpack',
};
const TAB_TO_ROUTE: Record<TabKey, string> = {
  home: 'home',
  communities: 'communities',
  create: 'create',
  chat: 'chat',
  backpack: 'backpack',
};

function AppTabBar({ state, navigateToTab }: TabBarRenderProps) {
  const { t } = useTranslation();
  const current = ROUTE_TO_TAB[state.routes[state.index]?.name ?? 'home'] ?? 'home';
  return (
    <TabBar
      active={current === 'create' ? 'home' : current}
      labels={{
        home: t('tabs.home'),
        communities: t('tabs.communities'),
        create: t('tabs.create'),
        chat: t('tabs.chat'),
        backpack: t('tabs.backpack'),
      }}
      onPress={(key) => {
        if (key === 'create') {
          router.push('/compose'); // opens the composer modal over the current tab
          return;
        }
        const route = state.routes.find((r) => r.name === TAB_TO_ROUTE[key]);
        if (route) navigateToTab(route.key);
      }}
    />
  );
}

export const unstable_settings = { initialRouteName: 'home' };

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="communities" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="backpack" />
    </Tabs>
  );
}
