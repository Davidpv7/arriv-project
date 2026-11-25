import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';

export type Community = Tables<'communities'>;
export type MemberRole = Tables<'community_members'>['role'];

export type CommunityFilter = 'all' | 'near' | 'visa' | 'joined';

export const communityKeys = {
  all: ['communities'] as const,
  list: (search: string, filter: CommunityFilter, me: string) =>
    ['communities', 'list', search.trim().toLowerCase(), filter, me] as const,
  bySlug: (slug: string) => ['communities', 'slug', slug.toLowerCase()] as const,
  memberships: (me: string) => ['communities', 'memberships', me] as const,
  suggested: (me: string) => ['communities', 'suggested', me] as const,
};

/** My memberships: community id → role. */
export function useMyMemberships() {
  const me = useUserId();
  return useQuery({
    queryKey: communityKeys.memberships(me),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', me);
      if (error) throw error;
      return new Map(data.map((m) => [m.community_id, m.role]));
    },
  });
}

/** Departures board: search by name, filter by my city / visa / joined. */
export function useCommunities(
  search: string,
  filter: CommunityFilter,
  context: { city: string | null; visa: string | null; joinedIds: string[] },
) {
  const me = useUserId();
  return useQuery({
    queryKey: [
      ...communityKeys.list(search, filter, me),
      context.city,
      context.visa,
      context.joinedIds.length,
    ],
    queryFn: async (): Promise<Community[]> => {
      let query = supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })
        .order('name')
        .limit(50);
      const q = search.trim();
      if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
      if (filter === 'near') {
        query = context.city
          ? query.or(`city.ilike.${context.city},city.is.null`)
          : query.is('city', null);
      }
      if (filter === 'visa') {
        if (!context.visa) return [];
        query = query.eq('visa_subclass', context.visa);
      }
      if (filter === 'joined') {
        if (context.joinedIds.length === 0) return [];
        query = query.in('id', context.joinedIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: communityKeys.bySlug(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', slug.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSuggestedCommunities() {
  const me = useUserId();
  return useQuery({
    queryKey: communityKeys.suggested(me),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('suggest_communities', { p_limit: 8 });
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateCommunities() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: communityKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['chat'] }); // community chat rooms follow membership
  };
}

export function useJoinCommunity() {
  const me = useUserId();
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await supabase
        .from('community_members')
        .insert({ community_id: communityId, user_id: me });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useLeaveCommunity() {
  const me = useUserId();
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', me);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export type NewCommunity = Pick<
  TablesInsert<'communities'>,
  'name' | 'description' | 'kind' | 'city' | 'language' | 'visa_subclass' | 'tags' | 'stamp_color'
>;

/** Anyone can create a community (decided 25 Nov 2026); the creator becomes owner. */
export function useCreateCommunity() {
  const me = useUserId();
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: async (input: NewCommunity) => {
      const { data, error } = await supabase
        .from('communities')
        .insert({ ...input, created_by: me })
        .select('slug')
        .single();
      if (error) throw error;
      return data.slug;
    },
    onSuccess: invalidate,
  });
}

export type JoinedCommunity = Pick<Community, 'id' | 'name' | 'slug' | 'stamp_color'>;

/** Crews I've joined (composer destinations, profile "Crews"). */
export function useJoinedCommunities(userId?: string) {
  const me = useUserId();
  const who = userId ?? me;
  return useQuery({
    queryKey: [...communityKeys.all, 'joined', who],
    queryFn: async (): Promise<JoinedCommunity[]> => {
      const { data, error } = await supabase
        .from('community_members')
        .select('joined_at, community:communities(id, name, slug, stamp_color)')
        .eq('user_id', who)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return data.flatMap((m) => (m.community ? [m.community] : []));
    },
  });
}
