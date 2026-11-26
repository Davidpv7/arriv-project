import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

import {
  removeDocumentFile,
  signDocument,
  sortFolders,
  uploadDocumentFile,
  type Folder,
  type PickedDocument,
} from './files';

export const backpackKeys = {
  all: ['backpack'] as const,
  folders: (me: string) => ['backpack', 'folders', me] as const,
  documents: (me: string) => ['backpack', 'documents', me] as const,
  document: (id: string) => ['backpack', 'document', id] as const,
  preview: (id: string) => ['backpack', 'preview', id] as const,
};

const FOLDER_SELECT = 'id, kind, name, position, created_at, documents(count)' as const;
const DOCUMENT_SELECT =
  'id, folder_id, name, storage_path, mime_type, size_bytes, created_at, updated_at' as const;

export type BackpackFolder = Folder & { created_at: string; count: number };
export type BackpackDocument = Pick<
  Tables<'documents'>,
  | 'id'
  | 'folder_id'
  | 'name'
  | 'storage_path'
  | 'mime_type'
  | 'size_bytes'
  | 'created_at'
  | 'updated_at'
>;

/** My folders (defaults first) with how many documents each holds. */
export function useFolders() {
  const me = useUserId();
  return useQuery({
    queryKey: backpackKeys.folders(me),
    queryFn: async (): Promise<BackpackFolder[]> => {
      const { data, error } = await supabase.from('backpack_folders').select(FOLDER_SELECT);
      if (error) throw error;
      return sortFolders(
        data.map(({ documents, ...f }) => ({ ...f, count: documents[0]?.count ?? 0 })),
      );
    },
  });
}

/**
 * Every document I own, newest first. A Backpack is small (a few dozen files), so
 * folders, recents and the chat picker all read from this one list.
 */
export function useDocuments() {
  const me = useUserId();
  return useQuery({
    queryKey: backpackKeys.documents(me),
    queryFn: async (): Promise<BackpackDocument[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: backpackKeys.document(id),
    queryFn: async (): Promise<BackpackDocument | null> => {
      const { data, error } = await supabase
        .from('documents')
        .select(DOCUMENT_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * A signed URL for showing or opening the file, refreshed before the 5-minute link
 * expires. Signing ahead lets "Open" run straight from the tap (web popup blockers).
 */
export function useDocumentUrl(doc: BackpackDocument | null | undefined) {
  return useQuery({
    queryKey: backpackKeys.preview(doc?.id ?? ''),
    queryFn: () => signDocument(doc?.storage_path ?? ''),
    enabled: !!doc,
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
  });
}

function useInvalidateBackpack() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: backpackKeys.all });
}

export type NewDocument = { picked: PickedDocument; name: string; folderId: string };

/** Uploads the file, then adds the row. If the row can't be added, the file is removed. */
export function useAddDocument() {
  const me = useUserId();
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async ({ picked, name, folderId }: NewDocument) => {
      const file = await uploadDocumentFile(me, picked);
      const { data, error } = await supabase
        .from('documents')
        .insert({
          id: file.id,
          owner_id: me,
          uploaded_by: me,
          folder_id: folderId,
          name,
          storage_path: file.path,
          mime_type: file.mime,
          size_bytes: file.size,
        })
        .select(DOCUMENT_SELECT)
        .single();
      if (error) {
        await removeDocumentFile(file.path).catch(() => undefined);
        throw error;
      }
      return data;
    },
    onSuccess: () => void invalidate(),
  });
}

/** Rename and/or move to another of my folders. */
export function useUpdateDocument() {
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; folder_id?: string }) => {
      const { error } = await supabase.from('documents').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });
}

/**
 * Removes the row, then the stored file. If removing the file fails, the row is
 * already gone and the file stays private in my folder; account deletion removes it.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async (doc: Pick<BackpackDocument, 'id' | 'storage_path'>) => {
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      await removeDocumentFile(doc.storage_path).catch(() => undefined);
      return doc.id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: backpackKeys.document(id) });
      queryClient.removeQueries({ queryKey: backpackKeys.preview(id) });
      void invalidate();
    },
  });
}

export function useCreateFolder() {
  const me = useUserId();
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('backpack_folders')
        .insert({ owner_id: me, name })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => void invalidate(),
  });
}

/** `name: null` gives a default folder its translated name back. */
export function useRenameFolder() {
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string | null }) => {
      const { error } = await supabase.from('backpack_folders').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
  });
}

/** Only my own (non-default), empty folders can be deleted; the database checks both. */
export function useDeleteFolder() {
  const invalidate = useInvalidateBackpack();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('backpack_folders')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (data.length === 0) throw new Error('Folder not deleted');
    },
    onSuccess: () => void invalidate(),
  });
}

/** Postgres error codes the screens explain: a non-empty folder, the folder limit. */
export const isFolderNotEmpty = (e: unknown) => hasCode(e, '23503');
export const isFolderLimit = (e: unknown) => hasCode(e, '54000');

function hasCode(e: unknown, code: string) {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === code;
}
