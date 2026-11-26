import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import type { BackpackDocument } from '@/features/backpack/api';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { toMilestoneRow, type Milestone, type MilestoneFormValues } from './rules';

export const journeyKeys = {
  all: ['journey'] as const,
  mine: (me: string) => ['journey', 'mine', me] as const,
  milestone: (id: string) => ['journey', 'milestone', id] as const,
  documents: (id: string) => ['journey', 'documents', id] as const,
  stamps: (userId: string) => ['journey', 'stamps', userId] as const,
};

export type Stamp = Database['public']['Functions']['get_stamps']['Returns'][number];

/** All my milestones: done stamps and upcoming items. */
export function useMilestones() {
  const me = useUserId();
  return useQuery({
    queryKey: journeyKeys.mine(me),
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase.from('milestones').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function useMilestone(id: string) {
  return useQuery({
    queryKey: journeyKeys.milestone(id),
    queryFn: async (): Promise<Milestone | null> => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Someone's done stamps as far as I may see them (the database decides). */
export function useStamps(userId: string | undefined) {
  return useQuery({
    queryKey: journeyKeys.stamps(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Stamp[]> => {
      const { data, error } = await supabase.rpc('get_stamps', { p_user: userId ?? '' });
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateJourney() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: journeyKeys.all });
}

export function useSaveMilestone() {
  const me = useUserId();
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: MilestoneFormValues }) => {
      const row = toMilestoneRow(values);
      const query = id
        ? supabase.from('milestones').update(row).eq('id', id)
        : supabase.from('milestones').insert({ ...row, user_id: me });
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => void invalidate(),
  });
}

/** An upcoming item happened: it becomes a done stamp dated today (or the given day). */
export function useMarkDone() {
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: async ({ id, happenedOn }: { id: string; happenedOn: string }) => {
      const { error } = await supabase
        .from('milestones')
        .update({ status: 'done', happened_on: happenedOn, due_on: null, remind_on: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateJourney();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milestones').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: journeyKeys.milestone(id) });
      void invalidate();
      // A shared journey update keeps its stamp, but no longer links to the milestone.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

type LinkedDocument = Pick<
  BackpackDocument,
  | 'id'
  | 'folder_id'
  | 'name'
  | 'storage_path'
  | 'mime_type'
  | 'size_bytes'
  | 'created_at'
  | 'updated_at'
>;

/** Backpack documents linked to a milestone. */
export function useMilestoneDocuments(milestoneId: string) {
  return useQuery({
    queryKey: journeyKeys.documents(milestoneId),
    queryFn: async (): Promise<LinkedDocument[]> => {
      const { data, error } = await supabase
        .from('milestone_documents')
        .select(
          'document:documents(id, folder_id, name, storage_path, mime_type, size_bytes, created_at, updated_at)',
        )
        .eq('milestone_id', milestoneId)
        .order('created_at');
      if (error) throw error;
      return data.flatMap((r) => (r.document ? [r.document] : []));
    },
  });
}

export function useLinkDocument() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      milestoneId,
      documentId,
    }: {
      milestoneId: string;
      documentId: string;
    }) => {
      const { error } = await supabase
        .from('milestone_documents')
        .insert({ milestone_id: milestoneId, document_id: documentId, user_id: me });
      if (error) throw error;
    },
    onSuccess: (_d, { milestoneId }) =>
      queryClient.invalidateQueries({ queryKey: journeyKeys.documents(milestoneId) }),
  });
}

export function useUnlinkDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      milestoneId,
      documentId,
    }: {
      milestoneId: string;
      documentId: string;
    }) => {
      const { error } = await supabase
        .from('milestone_documents')
        .delete()
        .eq('milestone_id', milestoneId)
        .eq('document_id', documentId);
      if (error) throw error;
    },
    onSuccess: (_d, { milestoneId }) =>
      queryClient.invalidateQueries({ queryKey: journeyKeys.documents(milestoneId) }),
  });
}
