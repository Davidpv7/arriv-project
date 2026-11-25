import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession, useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database';

import type { Visibility } from './schemas';

export type Profile = Tables<'profiles'>;
export type ProfileVisa = Tables<'profile_visas'>;
export type ProfileWithVisa = Profile & { visa: ProfileVisa | null };

export type ConnectionState =
  { kind: 'none' } | { kind: 'outgoing' } | { kind: 'incoming' } | { kind: 'connected' };

export const profileKeys = {
  me: (id: string) => ['profile', 'me', id] as const,
  byHandle: (handle: string) => ['profile', 'handle', handle.toLowerCase()] as const,
  connection: (me: string, them: string) => ['connection', me, them] as const,
  connectionCount: (id: string) => ['connection-count', id] as const,
  connections: (me: string) => ['connections', me] as const,
  blocks: (me: string) => ['blocks', me] as const,
};

/** Postgres error codes we turn into field errors. */
export function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

/** The signed-in user's profile and visa. Enabled whenever there is a session. */
export function useMyProfile() {
  const { session } = useSession();
  const id = session?.user.id;
  return useQuery({
    queryKey: profileKeys.me(id ?? 'none'),
    enabled: !!id,
    queryFn: async (): Promise<ProfileWithVisa> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, visa:profile_visas(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Someone's profile by handle. Null when it doesn't exist or a block hides it. */
export function useProfileByHandle(handle: string) {
  return useQuery({
    queryKey: profileKeys.byHandle(handle),
    queryFn: async (): Promise<ProfileWithVisa | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, visa:profile_visas(*)')
        .eq('handle', handle.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectionCount(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.connectionCount(userId ?? 'none'),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('connection_count', { p_user: userId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectionState(them: string | undefined) {
  const me = useUserId();
  return useQuery({
    queryKey: profileKeys.connection(me, them ?? 'none'),
    enabled: !!them && them !== me,
    queryFn: async (): Promise<ConnectionState> => {
      const { data, error } = await supabase
        .from('connections')
        .select('requester_id, status')
        .or(
          `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`,
        )
        .maybeSingle();
      if (error) throw error;
      if (!data) return { kind: 'none' };
      if (data.status === 'accepted') return { kind: 'connected' };
      return { kind: data.requester_id === me ? 'outgoing' : 'incoming' };
    },
  });
}

type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  'display_name' | 'handle' | 'bio' | 'origin_country' | 'city' | 'arrived_on' | 'onboarded_at'
>;
type VisaUpdate = {
  visa_subclass: string | null;
  visa_label: string | null;
  visibility: Visibility;
};

/** Saves profile fields and the visa together (edit profile and finishing onboarding). */
export function useSaveProfile() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile, visa }: { profile: ProfileUpdate; visa?: VisaUpdate }) => {
      // Visa first: when finishing onboarding, onboarded_at flips the app to Home,
      // so everything else should already be saved.
      if (visa) {
        const { error } = await supabase.from('profile_visas').update(visa).eq('user_id', me);
        if (error) throw error;
      }
      const { error } = await supabase.from('profiles').update(profile).eq('id', me);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export type ConnectionPerson = Pick<
  Profile,
  'id' | 'handle' | 'display_name' | 'avatar_path' | 'city'
>;
export type ConnectionRow = {
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
  person: ConnectionPerson;
};

/** My connections and pending requests. */
export function useMyConnections() {
  const me = useUserId();
  return useQuery({
    queryKey: profileKeys.connections(me),
    queryFn: async (): Promise<ConnectionRow[]> => {
      const person = 'id, handle, display_name, avatar_path, city';
      const { data, error } = await supabase
        .from('connections')
        .select(
          `status, requester_id, created_at,
           requester:profiles!connections_requester_id_fkey(${person}),
           addressee:profiles!connections_addressee_id_fkey(${person})`,
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.flatMap((row) => {
        const outgoing = row.requester_id === me;
        const other = outgoing ? row.addressee : row.requester;
        return other
          ? [{ status: row.status, direction: outgoing ? 'outgoing' : 'incoming', person: other }]
          : [];
      });
    },
  });
}

function useConnectionMutation<T>(
  fn: (me: string, them: string) => PromiseLike<{ error: T | null }>,
) {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (them: string) => {
      const { error } = await fn(me, them);
      if (error) throw error;
    },
    onSuccess: (_d, them) => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.connection(me, them) });
      void queryClient.invalidateQueries({ queryKey: profileKeys.connections(me) });
      void queryClient.invalidateQueries({ queryKey: ['connection-count'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] }); // visas may become visible
    },
  });
}

export const useRequestConnection = () =>
  useConnectionMutation((me, them) =>
    supabase.from('connections').insert({ requester_id: me, addressee_id: them }),
  );

export const useAcceptConnection = () =>
  useConnectionMutation((me, them) =>
    supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('requester_id', them)
      .eq('addressee_id', me),
  );

/** Cancel a request, decline one, or remove a connection. */
export const useRemoveConnection = () =>
  useConnectionMutation((me, them) =>
    supabase
      .from('connections')
      .delete()
      .or(
        `and(requester_id.eq.${me},addressee_id.eq.${them}),and(requester_id.eq.${them},addressee_id.eq.${me})`,
      ),
  );
