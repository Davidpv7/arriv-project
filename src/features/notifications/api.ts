import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';

import { LIST_TYPES } from './format';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (me: string) => ['notifications', 'list', me] as const,
  unread: (me: string) => ['notifications', 'unread', me] as const,
  settings: (me: string) => ['notifications', 'settings', me] as const,
};

export type AppNotification = Tables<'notifications'> & {
  actor: Pick<Tables<'profiles'>, 'id' | 'handle' | 'display_name' | 'avatar_path'> | null;
};

/** My latest 50 notifications, newest first. */
export function useNotifications() {
  const me = useUserId();
  return useQuery({
    queryKey: notificationKeys.list(me),
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(
          '*, actor:profiles!notifications_actor_id_fkey(id, handle, display_name, avatar_path)',
        )
        .in('type', LIST_TYPES)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useUnreadNotificationCount() {
  const me = useUserId();
  return useQuery({
    queryKey: notificationKeys.unread(me),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .in('type', LIST_TYPES)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Opening the list marks everything in it as read. */
export function useMarkNotificationsRead() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.setQueryData(notificationKeys.unread(me), 0),
  });
}

/** Keeps the badge and list live (Realtime only delivers my own rows). */
export function useNotificationsRealtime() {
  const me = useUserId();
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${me}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me}` },
        () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, queryClient]);
}

export type PushSettings = Pick<
  Tables<'notification_settings'>,
  'messages' | 'comments' | 'likes' | 'connections' | 'community_joins' | 'reminders'
>;
export const PUSH_KINDS: (keyof PushSettings)[] = [
  'messages',
  'comments',
  'likes',
  'connections',
  'community_joins',
  'reminders',
];
const ALL_ON: PushSettings = {
  messages: true,
  comments: true,
  likes: true,
  connections: true,
  community_joins: true,
  reminders: true,
};

/** My push settings (everything on until I change something). */
export function usePushSettings() {
  const me = useUserId();
  return useQuery({
    queryKey: notificationKeys.settings(me),
    queryFn: async (): Promise<PushSettings> => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('messages, comments, likes, connections, community_joins, reminders')
        .maybeSingle();
      if (error) throw error;
      return data ?? ALL_ON;
    },
  });
}

/** Turn one kind of push on or off (optimistic). */
export function useSetPushSetting() {
  const me = useUserId();
  const queryClient = useQueryClient();
  const key = notificationKeys.settings(me);
  return useMutation({
    mutationFn: async ({ kind, on }: { kind: keyof PushSettings; on: boolean }) => {
      const row: TablesInsert<'notification_settings'> = { user_id: me };
      row[kind] = on;
      const { error } = await supabase
        .from('notification_settings')
        .upsert(row, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: ({ kind, on }) => {
      const before = queryClient.getQueryData<PushSettings>(key);
      queryClient.setQueryData<PushSettings>(key, { ...(before ?? ALL_ON), [kind]: on });
      return { before };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(key, ctx?.before),
  });
}

/** A community's slug from its id (notifications store the id). */
export async function communitySlug(id: string): Promise<string | null> {
  const { data } = await supabase.from('communities').select('slug').eq('id', id).maybeSingle();
  return data?.slug ?? null;
}
