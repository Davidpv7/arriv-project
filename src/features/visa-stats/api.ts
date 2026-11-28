import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { journeyKeys } from '@/features/journey/api';
import { supabase } from '@/lib/supabase';

import { parseVisaStats, type VisaStats } from './stats';

export const visaStatsKeys = {
  all: ['visa-stats'] as const,
  subclass: (subclass: string) => ['visa-stats', subclass] as const,
};

/** Member-reported totals for one subclass (only groups of 5 or more; the database decides). */
export function useVisaStats(subclass: string | null) {
  return useQuery({
    queryKey: visaStatsKeys.subclass(subclass ?? ''),
    enabled: !!subclass,
    queryFn: async (): Promise<VisaStats | null> => {
      const { data, error } = await supabase.rpc('get_visa_stats', {
        p_subclass: subclass ?? '',
      });
      if (error) throw error;
      return parseVisaStats(data);
    },
  });
}

/** Count one of my visa stamps in the visa stats, or stop counting it. */
export function useSetShareStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, share }: { id: string; share: boolean }) => {
      const { error } = await supabase
        .from('milestones')
        .update({ share_stats: share })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: journeyKeys.all });
      void queryClient.invalidateQueries({ queryKey: visaStatsKeys.all });
    },
  });
}
