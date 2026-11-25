import { router } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { PhotoGrid, Postcard } from '@/components/ds';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';

import { useToggleLike, type FeedPost } from '../api';
import { asStampColor, communityInitials, relativeTime } from '../format';

export type PostCardProps = {
  post: FeedPost;
  /** In lists, long posts are cut and the card opens the post. */
  compact?: boolean;
};

/** A post from the database rendered as the DS Postcard. */
export const PostCard = memo(function PostCard({ post, compact = true }: PostCardProps) {
  const { t } = useTranslation();
  const like = useToggleLike();
  const author = post.author;
  const where = post.community?.name ?? t('feed.profilePost');
  const openPost = () => router.push(`/post/${post.id}`);

  return (
    <Postcard
      author={{
        name: author?.display_name ?? '',
        initials: initials(author?.display_name ?? '?'),
        avatarUri: avatarUrl(author?.avatar_path),
        avatarFill: 'sky',
      }}
      meta={`${where} · ${relativeTime(t, post.created_at)}`}
      community={
        post.community
          ? {
              initials: communityInitials(post.community.name),
              fill: asStampColor(post.community.stamp_color),
              name: post.community.name,
            }
          : undefined
      }
      tag={post.kind === 'question' ? t('feed.question') : undefined}
      body={post.body}
      bodyLines={compact ? 8 : undefined}
      onPress={compact ? openPost : undefined}
      likes={{
        count: post.like_count,
        label: String(post.like_count),
        liked: post.liked,
        accessibilityLabel: t(post.liked ? 'feed.unlikeA11y' : 'feed.likeA11y', {
          count: post.like_count,
        }),
        onPress: () => like.mutate({ postId: post.id, liked: post.liked }),
      }}
      comments={{
        label: t('feed.comments', { count: post.comment_count }),
        onPress: compact ? openPost : undefined,
      }}
    >
      {post.images.length > 0 && (
        <PhotoGrid
          photos={post.images.map((i) => ({ id: i.id, uri: i.url }))}
          labelFor={(n, total) => t('feed.imageA11y', { n: n + 1, total })}
        />
      )}
    </Postcard>
  );
});
