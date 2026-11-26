/** Pure: what a notification says and where tapping it goes. */

import type { Href } from 'expo-router';

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'like'
  | 'connection_request'
  | 'connection_accepted'
  | 'community_join'
  | 'milestone_reminder'
  | 'message';

/** The kinds shown in the list (messages are push only). */
export const LIST_TYPES: NotificationType[] = [
  'comment',
  'reply',
  'like',
  'connection_request',
  'connection_accepted',
  'community_join',
  'milestone_reminder',
];

export type Destination =
  | { kind: 'href'; href: Href }
  /** Communities are opened by slug, which the app looks up from the id. */
  | { kind: 'community'; id: string }
  | null;

export function destination(n: {
  type: string;
  entity_id: string | null;
  actor: { handle: string } | null;
}): Destination {
  switch (n.type) {
    case 'comment':
    case 'reply':
    case 'like':
      return n.entity_id ? { kind: 'href', href: `/post/${n.entity_id}` } : null;
    case 'connection_request':
      return { kind: 'href', href: '/connections' };
    case 'connection_accepted':
      return n.actor ? { kind: 'href', href: `/profile/${n.actor.handle}` } : null;
    case 'community_join':
      return n.entity_id ? { kind: 'community', id: n.entity_id } : null;
    case 'milestone_reminder':
      return n.entity_id ? { kind: 'href', href: `/journey/${n.entity_id}` } : null;
    default:
      return null;
  }
}
