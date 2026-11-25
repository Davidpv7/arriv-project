import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Database, Tables } from '@/types/database';

import {
  isImageMime,
  removeChatAttachment,
  signChatAttachments,
  uploadChatAttachment,
  type PickedAttachment,
} from './attachments';

const PAGE = 30;

type ProfileCard = Pick<Tables<'profiles'>, 'id' | 'handle' | 'display_name' | 'avatar_path'>;
const PROFILE_CARD = 'id, handle, display_name, avatar_path' as const;

export type ConversationKind = Database['public']['Enums']['conversation_kind'];

export const chatKeys = {
  all: ['chat'] as const,
  inbox: (me: string) => ['chat', 'inbox', me] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  myInvites: (me: string) => ['chat', 'invites', 'mine', me] as const,
  groupInvites: (id: string) => ['chat', 'invites', 'group', id] as const,
};

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

type InboxRpcRow = Database['public']['Functions']['get_inbox']['Returns'][number];

/** get_inbox's generated type says every column is non-null; these can be null. */
type InboxRow = Omit<
  InboxRpcRow,
  | 'title'
  | 'community_id'
  | 'other_user_id'
  | 'last_message_id'
  | 'last_message_body'
  | 'last_message_sender_id'
> & {
  title: string | null;
  community_id: string | null;
  other_user_id: string | null;
  last_message_id: number | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
};

export type InboxItem = InboxRow & {
  community: Pick<Tables<'communities'>, 'id' | 'slug' | 'name' | 'stamp_color'> | null;
  other: ProfileCard | null;
};

/** Every conversation I'm in, newest activity first, with the community or other person. */
export function useInbox() {
  const me = useUserId();
  return useQuery({
    queryKey: chatKeys.inbox(me),
    queryFn: async (): Promise<InboxItem[]> => {
      const { data, error } = await supabase.rpc('get_inbox');
      if (error) throw error;
      const rows = data as InboxRow[];

      const communityIds = [
        ...new Set(rows.flatMap((r) => (r.community_id ? [r.community_id] : []))),
      ];
      const otherIds = [
        ...new Set(rows.flatMap((r) => (r.other_user_id ? [r.other_user_id] : []))),
      ];
      const [communities, profiles] = await Promise.all([
        communityIds.length
          ? supabase
              .from('communities')
              .select('id, slug, name, stamp_color')
              .in('id', communityIds)
          : Promise.resolve({ data: [], error: null }),
        otherIds.length
          ? supabase.from('profiles').select(PROFILE_CARD).in('id', otherIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (communities.error) throw communities.error;
      if (profiles.error) throw profiles.error;
      const communityById = new Map(communities.data.map((c) => [c.id, c]));
      const profileById = new Map(profiles.data.map((p) => [p.id, p]));

      return rows.map((r) => ({
        ...r,
        community: r.community_id ? (communityById.get(r.community_id) ?? null) : null,
        other: r.other_user_id ? (profileById.get(r.other_user_id) ?? null) : null,
      }));
    },
  });
}

/** Total unread across unmuted conversations (tab badge). */
export function useUnreadTotal() {
  const { data } = useInbox();
  return (data ?? []).reduce((sum, c) => sum + (c.muted ? 0 : c.unread_count), 0);
}

/** Refresh the inbox whenever a message arrives in any of my conversations (RLS filters). */
export function useInboxRealtime() {
  const me = useUserId();
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${me}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, queryClient]);
}

// ---------------------------------------------------------------------------
// One conversation
// ---------------------------------------------------------------------------

type MemberRow = Pick<
  Tables<'conversation_members'>,
  'user_id' | 'role' | 'last_read_at' | 'muted'
> & {
  profile: ProfileCard | null;
};

export type ConversationCommunity = Pick<
  Tables<'communities'>,
  'id' | 'slug' | 'name' | 'stamp_color' | 'city' | 'member_count'
>;

export type Conversation = Tables<'conversations'> & {
  community: ConversationCommunity | null;
  /** Everyone in direct and group chats. For community rooms, only my own row (rooms can be large). */
  members: MemberRow[];
  me: MemberRow | null;
};

/** The conversation, its community (if any) and its members. Null if I can't see it. */
export function useConversation(id: string) {
  const me = useUserId();
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: async (): Promise<Conversation | null> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, community:communities(id, slug, name, stamp_color, city, member_count)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      let members = supabase
        .from('conversation_members')
        .select(`user_id, role, last_read_at, muted, profile:profiles(${PROFILE_CARD})`)
        .eq('conversation_id', id)
        .order('joined_at');
      if (data.kind === 'community') members = members.eq('user_id', me);
      const { data: rows, error: membersError } = await members;
      if (membersError) throw membersError;
      return { ...data, members: rows, me: rows.find((m) => m.user_id === me) ?? null };
    },
  });
}

/** The chat room of a community I've joined (null if I'm not a member). */
export function useCommunityConversationId(communityId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'community-room', communityId],
    enabled: !!communityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('community_id', communityId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const MESSAGE_SELECT = `*, sender:profiles(${PROFILE_CARD})` as const;

type MessageRow = Tables<'messages'> & { sender: ProfileCard | null };

export type ChatMessage = MessageRow & {
  attachment: { url: string; name: string; mime: string; isImage: boolean } | null;
};

type MessagePage = { messages: ChatMessage[]; nextCursor: number | null };

async function hydrateMessages(rows: MessageRow[]): Promise<ChatMessage[]> {
  const urls = await signChatAttachments(
    rows.flatMap((r) => (r.attachment_path ? [r.attachment_path] : [])),
  );
  return rows.map((r) => {
    const url = r.attachment_path ? urls.get(r.attachment_path) : undefined;
    return {
      ...r,
      attachment:
        url && r.attachment_name && r.attachment_mime
          ? {
              url,
              name: r.attachment_name,
              mime: r.attachment_mime,
              isImage: isImageMime(r.attachment_mime),
            }
          : null,
    };
  });
}

/** Newest first, 30 at a time (render inverted). */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    initialPageParam: null as number | null,
    getNextPageParam: (last: MessagePage) => last.nextCursor,
    queryFn: async ({ pageParam }): Promise<MessagePage> => {
      let query = supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .order('id', { ascending: false })
        .limit(PAGE);
      if (pageParam != null) query = query.lt('id', pageParam);
      const { data, error } = await query;
      if (error) throw error;
      return {
        messages: await hydrateMessages(data),
        nextCursor: data.length === PAGE ? (data[data.length - 1]?.id ?? null) : null,
      };
    },
  });
}

/** Insert or replace one message at the top of the cached list. */
function useUpsertCachedMessage() {
  const queryClient = useQueryClient();
  return useCallback(
    (conversationId: string, message: ChatMessage) =>
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatKeys.messages(conversationId),
        (data) => {
          if (!data) return data;
          const exists = data.pages.some((p) => p.messages.some((m) => m.id === message.id));
          if (exists) {
            return {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                messages: p.messages.map((m) => (m.id === message.id ? message : m)),
              })),
            };
          }
          const [first, ...rest] = data.pages;
          if (!first) return data;
          return {
            ...data,
            pages: [{ ...first, messages: [message, ...first.messages] }, ...rest],
          };
        },
      ),
    [queryClient],
  );
}

async function fetchMessage(id: number): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [message] = await hydrateMessages([data]);
  return message ?? null;
}

/**
 * Live messages for an open conversation. Realtime delivers only rows I may read (RLS);
 * the full row (sender, signed URL) is then fetched and placed in the cache.
 * Deletions don't arrive live: they disappear on the next refetch.
 */
export function useConversationRealtime(conversationId: string) {
  const upsert = useUpsertCachedMessage();
  useEffect(() => {
    const filter = `conversation_id=eq.${conversationId}`;
    const onChange = (payload: { new: Partial<Tables<'messages'>> }) => {
      const id = payload.new.id;
      if (typeof id !== 'number') return;
      void fetchMessage(id).then((m) => {
        if (m) upsert(conversationId, m);
      });
    };
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, upsert]);
}

export type NewMessage = { body: string; attachment: PickedAttachment | null };

/** Uploads the attachment (if any), then sends. A failed send removes the uploaded file. */
export function useSendMessage(conversationId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  const upsert = useUpsertCachedMessage();
  return useMutation({
    mutationFn: async ({ body, attachment }: NewMessage) => {
      const text = body.trim();
      const uploaded = attachment ? await uploadChatAttachment(conversationId, attachment) : null;
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: me, body: text || null, ...uploaded })
        .select(MESSAGE_SELECT)
        .single();
      if (error) {
        if (uploaded) await removeChatAttachment(uploaded.attachment_path);
        throw error;
      }
      const [message] = await hydrateMessages([data]);
      return message;
    },
    onSuccess: (message) => {
      if (message) upsert(conversationId, message);
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
    },
  });
}

export function useEditMessage(conversationId: string) {
  const upsert = useUpsertCachedMessage();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .update({ body: body.trim() })
        .eq('id', id)
        .select(MESSAGE_SELECT)
        .single();
      if (error) throw error;
      const [message] = await hydrateMessages([data]);
      return message;
    },
    onSuccess: (message) => {
      if (message) upsert(conversationId, message);
    },
  });
}

/** Sender, community owner/moderator or admin (checked in the database). */
export function useDeleteMessage(conversationId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.rpc('delete_message', { p_message: id });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatKeys.messages(conversationId),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  messages: p.messages.filter((m) => m.id !== id),
                })),
              }
            : data,
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
    },
  });
}

// ---------------------------------------------------------------------------
// Read state and mute
// ---------------------------------------------------------------------------

function usePatchInboxItem() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return (conversationId: string, patch: Partial<InboxItem>) =>
    queryClient.setQueryData<InboxItem[]>(chatKeys.inbox(me), (items) =>
      items?.map((c) => (c.conversation_id === conversationId ? { ...c, ...patch } : c)),
    );
}

/** Call when the conversation is open and the newest message is on screen. */
export function useMarkRead(conversationId: string) {
  const me = useUserId();
  const patch = usePatchInboxItem();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', me);
      if (error) throw error;
    },
    onSuccess: () => patch(conversationId, { unread_count: 0 }),
  });
}

export function useSetMuted(conversationId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  const patch = usePatchInboxItem();
  return useMutation({
    mutationFn: async (muted: boolean) => {
      const { error } = await supabase
        .from('conversation_members')
        .update({ muted })
        .eq('conversation_id', conversationId)
        .eq('user_id', me);
      if (error) throw error;
      return muted;
    },
    onSuccess: (muted) => {
      patch(conversationId, { muted });
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Starting chats
// ---------------------------------------------------------------------------

/** Opens (or creates) the direct chat with someone. Resolves to the conversation id. */
export function useStartDirect() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('get_or_create_direct', {
        p_other_user: otherUserId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) }),
  });
}

/** Creates a group chat with me as owner; everyone else is invited. Resolves to its id. */
export function useCreateGroup() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, inviteeIds }: { title: string; inviteeIds: string[] }) => {
      const { data, error } = await supabase.rpc('create_group', {
        p_title: title.trim(),
        p_invitee_ids: inviteeIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) }),
  });
}

// ---------------------------------------------------------------------------
// Group chats: invites, rename, leave
// ---------------------------------------------------------------------------

export type MyGroupInvite = Pick<
  Tables<'conversation_invites'>,
  'conversation_id' | 'created_at'
> & {
  conversation: Pick<Tables<'conversations'>, 'id' | 'title'> | null;
  inviter: ProfileCard | null;
};

/** Group chats I've been invited to and haven't answered. */
export function useMyGroupInvites() {
  const me = useUserId();
  return useQuery({
    queryKey: chatKeys.myInvites(me),
    queryFn: async (): Promise<MyGroupInvite[]> => {
      const { data, error } = await supabase
        .from('conversation_invites')
        .select(
          `conversation_id, created_at,
          conversation:conversations(id, title),
          inviter:profiles!conversation_invites_invited_by_fkey(${PROFILE_CARD})`,
        )
        .eq('invitee_id', me)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRespondToGroupInvite() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, accept }: { conversationId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('respond_to_group_invite', {
        p_conversation: conversationId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.myInvites(me) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
    },
  });
}

export type PendingInvite = Pick<
  Tables<'conversation_invites'>,
  'invitee_id' | 'invited_by' | 'created_at'
> & {
  invitee: ProfileCard | null;
};

/** Invites still waiting for an answer in a group I'm in. */
export function useGroupInvites(conversationId: string) {
  return useQuery({
    queryKey: chatKeys.groupInvites(conversationId),
    queryFn: async (): Promise<PendingInvite[]> => {
      const { data, error } = await supabase
        .from('conversation_invites')
        .select(
          `invitee_id, invited_by, created_at, invitee:profiles!conversation_invites_invitee_id_fkey(${PROFILE_CARD})`,
        )
        .eq('conversation_id', conversationId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** Any member can invite. Resolves to how many were invited (members, blocks and repeats are skipped). */
export function useInviteToGroup(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const { data, error } = await supabase.rpc('invite_to_group', {
        p_conversation: conversationId,
        p_user_ids: userIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chatKeys.groupInvites(conversationId) }),
  });
}

/** The inviter or the group owner/moderator cancels a pending invite. */
export function useCancelGroupInvite(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteeId: string) => {
      const { error } = await supabase
        .from('conversation_invites')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('invitee_id', inviteeId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chatKeys.groupInvites(conversationId) }),
  });
}

/** Group owner/moderator only (RLS); a plain member's rename changes nothing and errors here. */
export function useRenameGroup(conversationId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ title: title.trim() })
        .eq('id', conversationId)
        .select('id');
      if (error) throw error;
      if (data.length === 0) throw new Error('Not allowed to rename this group');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
    },
  });
}

/** Leave a group chat. If I was the owner, the longest-standing member takes over. */
export function useLeaveGroup(conversationId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', me);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      queryClient.removeQueries({ queryKey: chatKeys.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(me) });
    },
  });
}
