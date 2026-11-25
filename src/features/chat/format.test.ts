import i18n from '@/i18n';

import {
  conversationTitle,
  filterInbox,
  messagePreview,
  messageTime,
  startsRun,
  unreadChatsByKind,
} from './format';

const t = i18n.t.bind(i18n);
const ME = 'me';

describe('conversationTitle', () => {
  it('names communities, groups and people', () => {
    const base = { title: null, community: null, other: null };
    expect(
      conversationTitle(t, { ...base, kind: 'community', community: { name: 'Sydney Newcomers' } }),
    ).toBe('Sydney Newcomers');
    expect(conversationTitle(t, { ...base, kind: 'group', title: ' Flatmates ' })).toBe(
      'Flatmates',
    );
    expect(conversationTitle(t, { ...base, kind: 'group' })).toBe('Group chat');
    expect(conversationTitle(t, { ...base, kind: 'direct', other: { display_name: 'Ana' } })).toBe(
      'Ana',
    );
    expect(conversationTitle(t, { ...base, kind: 'direct' })).toBe('Arriv traveller');
  });
});

describe('messagePreview', () => {
  const none = {
    last_message_id: null,
    last_message_body: null,
    last_message_sender_id: null,
    last_message_has_attachment: false,
  };

  it('says when there are no messages', () => {
    expect(messagePreview(t, none, ME)).toBe('No messages yet');
  });

  it('prefixes my own messages and flattens line breaks', () => {
    expect(
      messagePreview(
        t,
        {
          ...none,
          last_message_id: 1,
          last_message_body: 'See you\nthere',
          last_message_sender_id: ME,
        },
        ME,
      ),
    ).toBe('You: See you there');
  });

  it('labels attachments without text', () => {
    expect(
      messagePreview(
        t,
        {
          ...none,
          last_message_id: 2,
          last_message_sender_id: 'them',
          last_message_has_attachment: true,
        },
        ME,
      ),
    ).toBe('File');
  });
});

describe('messageTime', () => {
  const now = new Date(2026, 10, 26, 18, 0);
  it('shows the clock today, and the date otherwise', () => {
    expect(messageTime(new Date(2026, 10, 26, 9, 5).toISOString(), now)).toBe('09:05');
    expect(messageTime(new Date(2026, 2, 3, 14, 30).toISOString(), now)).toBe('3 Mar 14:30');
    expect(messageTime(new Date(2025, 11, 31, 23, 59).toISOString(), now)).toBe(
      '31 Dec 2025 23:59',
    );
  });
});

describe('startsRun', () => {
  const at = (min: number) => new Date(2026, 10, 26, 12, min).toISOString();
  // newest first
  const list = [
    { sender_id: 'a', created_at: at(30) },
    { sender_id: 'a', created_at: at(28) },
    { sender_id: 'a', created_at: at(10) },
    { sender_id: 'b', created_at: at(9) },
  ];

  it('groups close messages from the same person', () => {
    expect(startsRun(list, 0)).toBe(false); // 2 minutes after a's previous message
    expect(startsRun(list, 1)).toBe(true); // 18 minutes after a's previous message
    expect(startsRun(list, 2)).toBe(true); // b spoke just before
    expect(startsRun(list, 3)).toBe(true); // oldest loaded message
    expect(startsRun(list, 9)).toBe(false);
  });
});

describe('inbox filters', () => {
  const items = [
    { id: 1, kind: 'direct' as const, unread_count: 2, muted: false },
    { id: 2, kind: 'community' as const, unread_count: 5, muted: true },
    { id: 3, kind: 'group' as const, unread_count: 0, muted: false },
    { id: 4, kind: 'community' as const, unread_count: 1, muted: false },
  ];

  it('shows everything, or one kind, keeping the newest-first order', () => {
    expect(filterInbox(items, 'all').map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(filterInbox(items, 'community').map((c) => c.id)).toEqual([2, 4]);
    expect(filterInbox(items, 'group').map((c) => c.id)).toEqual([3]);
  });

  it('counts chats with unread messages per kind, ignoring muted ones', () => {
    expect(unreadChatsByKind(items)).toEqual({ all: 2, direct: 1, group: 0, community: 1 });
  });
});
