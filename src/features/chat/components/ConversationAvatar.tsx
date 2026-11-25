import { Avatar, Stamp } from '@/components/ds';
import { asStampColor, communityInitials } from '@/features/feed/format';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';

type Props = {
  kind: 'direct' | 'group' | 'community';
  title: string;
  community: { name: string; stamp_color: string } | null;
  other: { display_name: string; avatar_path: string | null } | null;
  size?: number;
};

/** Community chats wear their stamp; people their avatar; groups their initials. */
export function ConversationAvatar({ kind, title, community, other, size = 44 }: Props) {
  if (kind === 'community' && community) {
    return (
      <Stamp
        label={communityInitials(community.name)}
        fill={asStampColor(community.stamp_color)}
        tilt="sm"
      />
    );
  }
  if (kind === 'direct') {
    return (
      <Avatar
        initials={initials(other?.display_name ?? title)}
        uri={avatarUrl(other?.avatar_path)}
        size={size}
        fill="sky"
      />
    );
  }
  return <Avatar initials={initials(title)} size={size} fill="sunshine" />;
}
