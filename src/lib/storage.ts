import { supabase } from './supabase';

/** Public URL for an avatar path in the `avatars` bucket (public read). */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
