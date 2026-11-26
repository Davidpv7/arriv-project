import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Push notifications through Expo. The server sends them (the database queues them
 * to Expo's push service), so the app only has to register this device's token.
 * Push needs a real phone and a development or store build; web never registers.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushStatus = 'granted' | 'denied' | 'unavailable';

const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
  ?.projectId;

const canPush = () => Platform.OS !== 'web' && Device.isDevice && !!projectId;

/**
 * Registers this device for push. With `ask`, shows the system prompt if the person
 * hasn't answered yet (call it when they set a reminder, not on launch).
 */
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushStatus> {
  if (!canPush()) return 'unavailable';

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Arriv',
      importance: AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    if (error) throw error;
    return 'granted';
  } catch {
    // e.g. Expo Go on Android, which can't receive remote push.
    return 'unavailable';
  }
}

/** Stops pushes to this device for the person signing out. Call before signOut(). */
export async function unregisterPush(): Promise<void> {
  if (!canPush()) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Signing out must never fail because of push.
  }
}

/** Current permission without asking. */
export async function pushStatus(): Promise<PushStatus> {
  if (!canPush()) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

const openFrom = (response: Notifications.NotificationResponse | null) => {
  const url = response?.notification.request.content.data?.url;
  // Only in-app paths, e.g. "/journey/<id>".
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    router.push(url as Href);
  }
};

/**
 * While signed in: refresh this device's token if push is already allowed, and open
 * the right screen when a notification is tapped (also when it launched the app).
 */
export function usePushNotifications() {
  useEffect(() => {
    void registerForPush({ ask: false });
    if (Platform.OS === 'web') return;
    void Notifications.getLastNotificationResponseAsync().then(openFrom);
    const sub = Notifications.addNotificationResponseReceivedListener(openFrom);
    return () => sub.remove();
  }, []);
}
