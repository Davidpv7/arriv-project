import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import { profileKeys } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';

/** People I blocked (names via the my_blocks RPC, since RLS hides their profiles from me). */
export function useMyBlocks() {
  const me = useUserId();
  return useQuery({
    queryKey: profileKeys.blocks(me),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_blocks');
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateAfterBlockChange() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['blocks'] });
    void queryClient.invalidateQueries({ queryKey: ['profile'] });
    void queryClient.invalidateQueries({ queryKey: ['connection'] });
    void queryClient.invalidateQueries({ queryKey: ['connections'] });
    void queryClient.invalidateQueries({ queryKey: ['connection-count'] });
  };
}

/** Block someone. The database also removes any connection between you. */
export function useBlockUser() {
  const me = useUserId();
  const invalidate = useInvalidateAfterBlockChange();
  return useMutation({
    mutationFn: async (them: string) => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: them });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUnblockUser() {
  const me = useUserId();
  const invalidate = useInvalidateAfterBlockChange();
  return useMutation({
    mutationFn: async (them: string) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', me)
        .eq('blocked_id', them);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
