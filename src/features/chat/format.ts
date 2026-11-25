import type { TFunction } from 'i18next';

/** What the inbox needs to name a conversation. */
type Nameable = {
  kind: 'direct' | 'group' | 'community';
  title: string | null;
  community: { name: string } | null;
  other: { display_name: string } | null;
};

export function conversationTitle(t: TFunction, c: Nameable): string {
  if (c.kind === 'community') return c.community?.name ?? t('chat.kinds.community');
  if (c.kind === 'group') return c.title?.trim() || t('chat.untitledGroup');
  return c.other?.display_name ?? t('chat.unknownPerson');
}

type Previewable = {
  last_message_id: number | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  last_message_has_attachment: boolean;
};

/** "You: See you there", "Photo", or "No messages yet". */
export function messagePreview(t: TFunction, c: Previewable, me: string): string {
  if (c.last_message_id == null) return t('chat.noMessagesYet');
  const body = c.last_message_body?.replace(/\s+/g, ' ').trim();
  const text = body || (c.last_message_has_attachment ? t('chat.sentFile') : '');
  return c.last_message_sender_id === me ? `${t('chat.you')}: ${text}` : text;
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Time under a message: "14:05" today, "3 Mar 14:05" otherwise (year if not this year). */
export function messageTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return clock;
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear()
    ? `${day} ${clock}`
    : `${day} ${d.getFullYear()} ${clock}`;
}

type Sent = { sender_id: string; created_at: string };

const RUN_GAP_MS = 5 * 60_000;

/**
 * Messages are listed newest first (inverted list). A message starts a new "run" (and shows
 * the sender's name) when the message just before it in time is from someone else, or was
 * more than five minutes earlier.
 */
export function startsRun(messages: Sent[], index: number): boolean {
  const current = messages[index];
  const previous = messages[index + 1];
  if (!current) return false;
  if (!previous) return true;
  if (previous.sender_id !== current.sender_id) return true;
  return (
    new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() > RUN_GAP_MS
  );
}

export type InboxFilter = 'all' | 'direct' | 'group' | 'community';
export const INBOX_FILTERS: InboxFilter[] = ['all', 'direct', 'group', 'community'];

type Filterable = { kind: 'direct' | 'group' | 'community'; unread_count: number; muted: boolean };

export function filterInbox<T extends Filterable>(items: T[], filter: InboxFilter): T[] {
  return filter === 'all' ? items : items.filter((c) => c.kind === filter);
}

/** How many conversations of each kind have unread messages (muted ones don't count). */
export function unreadChatsByKind(items: Filterable[]): Record<InboxFilter, number> {
  const counts: Record<InboxFilter, number> = { all: 0, direct: 0, group: 0, community: 0 };
  for (const c of items) {
    if (c.muted || c.unread_count === 0) continue;
    counts.all += 1;
    counts[c.kind] += 1;
  }
  return counts;
}
