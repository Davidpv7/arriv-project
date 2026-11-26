import type { ParseKeys } from 'i18next';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

/** Browser-tab title for each part of the app (first matching path prefix wins). */
const TITLES: [prefix: string, key: ParseKeys][] = [
  ['/home', 'tabs.home'],
  ['/communities', 'tabs.communities'],
  ['/community', 'tabs.communities'],
  ['/new-crew', 'communities.newCrew'],
  ['/chat', 'tabs.chat'],
  ['/conversation', 'tabs.chat'],
  ['/backpack', 'backpack.title'],
  ['/folder', 'backpack.title'],
  ['/document', 'backpack.title'],
  ['/journey', 'journey.title'],
  ['/new-stamp', 'journey.title'],
  ['/notifications', 'notifications.title'],
  ['/settings', 'settings.title'],
  ['/connections', 'profile.viewConnections'],
  ['/profile', 'web.profileTitle'],
  ['/compose', 'compose.title'],
  ['/privacy', 'legal.privacy.title'],
  ['/terms', 'legal.terms.title'],
  ['/guidelines', 'legal.guidelines.title'],
  ['/sign-in', 'auth.signIn.title'],
  ['/sign-up', 'auth.signUp.title'],
];

/** Pure: "Chat · Arriv" for a path; just the tagline title for unknown paths. */
export function titleFor(pathname: string, t: (key: ParseKeys) => string): string {
  const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? `${t(match[1])} · Arriv` : t('web.defaultTitle');
}

/** Web only: keeps document.title in step with the current screen. */
export function useDocumentTitle() {
  const pathname = usePathname();
  const { t } = useTranslation();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = titleFor(pathname, t);
  }, [pathname, t]);
}
