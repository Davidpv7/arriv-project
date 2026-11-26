// Deletes the signed-in person's account (spec §6, Phase 7).
// 1. Refuses while they own a community: the app first asks them to hand each one
//    over or delete it (the database refuses too).
// 2. Removes all their stored files (Backpack, avatar, post photos, chat attachments).
// 3. Deletes the auth user; the database cascades the rest.
// The service-role key exists only here, never in the app.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'not_configured' }, 500);

  // Who is asking: verified by Supabase Auth from their own token.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);
  const asUser = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: who, error: authError } = await asUser.auth.getUser(token);
  if (authError || !who.user) return json({ error: 'unauthorized' }, 401);
  const userId = who.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Communities they still own.
  const { data: owned, error: ownedError } = await admin
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId)
    .eq('role', 'owner');
  if (ownedError) return json({ error: 'lookup_failed' }, 500);
  if (owned.length > 0) {
    return json({ error: 'owns_communities', communities: owned.map((o) => o.community_id) }, 409);
  }

  // 2. Their files, bucket by bucket, 100 at a time. Stop before deleting the account
  //    if any removal fails, so nothing is left behind without an owner.
  const { data: files, error: filesError } = await admin.rpc('account_storage_paths', {
    p_user: userId,
  });
  if (filesError) return json({ error: 'lookup_failed' }, 500);
  const byBucket = new Map<string, string[]>();
  for (const f of files as { bucket_id: string; name: string }[]) {
    byBucket.set(f.bucket_id, [...(byBucket.get(f.bucket_id) ?? []), f.name]);
  }
  let removed = 0;
  for (const [bucket, names] of byBucket) {
    for (let i = 0; i < names.length; i += 100) {
      const chunk = names.slice(i, i + 100);
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) return json({ error: 'files_failed', bucket }, 500);
      removed += chunk.length;
    }
  }

  // 3. The account (cascades to everything in the database).
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ ok: true, filesRemoved: removed });
});
