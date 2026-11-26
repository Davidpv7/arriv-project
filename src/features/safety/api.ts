import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import { profileKeys, useMyProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import type { Database, Tables } from '@/types/database';

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
    void queryClient.invalidateQueries({ queryKey: ['chat'] }); // blocked people's messages and direct chats
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

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportTarget = Database['public']['Enums']['report_target'];
export type ReportStatus = Database['public']['Enums']['report_status'];
export const REPORT_REASONS = ['spam', 'harassment', 'scam', 'false_information', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const reportKeys = {
  review: (status: ReportStatus) => ['reports', 'review', status] as const,
  openCount: ['reports', 'open-count'] as const,
};

/**
 * Report something. The database checks it exists and that I could see it, and keeps
 * a snapshot for the admins. Reporting the same thing twice counts as done.
 */
export function useReport() {
  const me = useUserId();
  return useMutation({
    mutationFn: async (r: {
      targetType: ReportTarget;
      targetId: string;
      reason: ReportReason;
      details: string;
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: me,
        target_type: r.targetType,
        target_id: r.targetId,
        reason: r.reason,
        details: r.details.trim() || null,
      });
      if (error && error.code !== '23505') throw error; // 23505: already reported, still open
    },
  });
}

/** Am I an admin? (Shows the review screen; the database enforces it anyway.) */
export function useIsAdmin() {
  const profile = useMyProfile();
  return profile.data?.role === 'admin';
}

type ProfileCard = Pick<Tables<'profiles'>, 'id' | 'handle' | 'display_name'>;
export type ReviewReport = Tables<'reports'> & {
  reporter: ProfileCard | null;
  target_user: ProfileCard | null;
};

/** Reports for admins: open ones oldest first (first come, first reviewed), closed newest first. */
export function useReviewReports(status: 'open' | 'closed') {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: reportKeys.review(status === 'open' ? 'open' : 'actioned'),
    enabled: isAdmin,
    queryFn: async (): Promise<ReviewReport[]> => {
      let query = supabase
        .from('reports')
        .select(
          '*, reporter:profiles!reports_reporter_id_fkey(id, handle, display_name), target_user:profiles!reports_target_user_id_fkey(id, handle, display_name)',
        )
        .limit(100);
      query =
        status === 'open'
          ? query.eq('status', 'open').order('created_at', { ascending: true })
          : query.neq('status', 'open').order('resolved_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOpenReportCount() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: reportKeys.openCount,
    enabled: isAdmin,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Remove the reported thing (posts, comments, messages, communities) or dismiss. */
export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remove }: { id: string; remove: boolean }) => {
      const { error } = await supabase.rpc('resolve_report', { p_report: id, p_remove: remove });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}
