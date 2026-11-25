import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

/**
 * One stack per tab. Shared screens (post, crew, profile, settings…) live here once and
 * open inside whichever tab you are in, so the tab bar stays visible and each tab keeps
 * its own history. Tapping the active tab pops its stack back to the top.
 */
export const unstable_settings = {
  anchor: 'home',
  home: { anchor: 'home' },
  communities: { anchor: 'communities' },
  chat: { anchor: 'chat' },
  backpack: { anchor: 'backpack' },
};

export default function TabStackLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
    />
  );
}
