import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { useUserId } from '@/features/auth/session';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

import { prepareImage, signPostImages, uploadPostImage, type PickedImage } from './images';

const PAGE = 20;

/** One select shape for every post list, so cards render the same everywhere. */
const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(id, handle, display_name, avatar_path),
  community:communities(id, slug, name, stamp_color),
  media:post_media(id, storage_path, width, height, position),
  my_like:post_likes(user_id)
` as const;

type PostRow = Tables<'posts'> & {
  author: Pick<Tables<'profiles'>, 'id' | 'handle' | 'display_name' | 'avatar_path'> | null;
  community: Pick<Tables<'communities'>, 'id' | 'slug' | 'name' | 'stamp_color'> | null;
  media: Pick<Tables<'post_media'>, 'id' | 'storage_path' | 'width' | 'height' | 'position'>[];
  my_like: { user_id: string }[];
};

export type FeedPost = Omit<PostRow, 'media' | 'my_like'> & {
  liked: boolean;
  images: { id: string; url: string; width: number | null; height: number | null }[];
};

export type Comment = Tables<'comments'> & {
  author: Pick<Tables<'profiles'>, 'id' | 'handle' | 'display_name' | 'avatar_path'> | null;
};

export const feedKeys = {
  home: (me: string) => ['feed', 'home', me] as const,
  community: (id: string) => ['feed', 'community', id] as const,
  author: (id: string) => ['feed', 'author', id] as const,
  post: (id: string) => ['feed', 'post', id] as const,
  comments: (postId: string) => ['feed', 'comments', postId] as const,
};

/** Adds signed image URLs and a `liked` flag to raw rows. */
async function hydrate(rows: PostRow[]): Promise<FeedPost[]> {
  const paths = rows.flatMap((r) => r.media.map((m) => m.storage_path));
  const urls = await signPostImages(paths);
  return rows.map(({ media, my_like, ...post }) => ({
    ...post,
    liked: my_like.length > 0,
    images: [...media]
      .sort((a, b) => a.position - b.position)
      .flatMap((m) => {
        const url = urls.get(m.storage_path);
        return url ? [{ id: m.id, url, width: m.width, height: m.height }] : [];
      }),
  }));
}

type Page = { posts: FeedPost[]; nextCursor: string | null };
const nextCursor = (rows: PostRow[]) =>
  rows.length === PAGE ? (rows[rows.length - 1]?.created_at ?? null) : null;

/** Home: own posts, joined communities, connections. Newest first, 20 at a time. */
export function useHomeFeed() {
  const me = useUserId();
  return useInfiniteQuery({
    queryKey: feedKeys.home(me),
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.nextCursor,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const { data, error } = await supabase
        .rpc('get_home_feed', { p_cursor: pageParam ?? undefined, p_limit: PAGE })
        .select(POST_SELECT)
        .eq('my_like.user_id', me);
      if (error) throw error;
      const rows = data as unknown as PostRow[];
      return { posts: await hydrate(rows), nextCursor: nextCursor(rows) };
    },
  });
}

/** Posts in one community, or by one author. */
export function usePostList(scope: { communityId: string } | { authorId: string }) {
  const me = useUserId();
  const key =
    'communityId' in scope
      ? feedKeys.community(scope.communityId)
      : feedKeys.author(scope.authorId);
  return useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.nextCursor,
    queryFn: async ({ pageParam }): Promise<Page> => {
      let query = supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('my_like.user_id', me)
        .order('created_at', { ascending: false })
        .limit(PAGE);
      query =
        'communityId' in scope
          ? query.eq('community_id', scope.communityId)
          : query.eq('author_id', scope.authorId);
      if (pageParam) query = query.lt('created_at', pageParam);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data as unknown as PostRow[];
      return { posts: await hydrate(rows), nextCursor: nextCursor(rows) };
    },
  });
}

export function usePost(id: string) {
  const me = useUserId();
  return useQuery({
    queryKey: feedKeys.post(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('id', id)
        .eq('my_like.user_id', me)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [post] = await hydrate([data as unknown as PostRow]);
      return post ?? null;
    },
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_author_id_fkey(id, handle, display_name, avatar_path)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

/** Update one post everywhere it is cached (lists and detail). */
function usePatchPost() {
  const queryClient = useQueryClient();
  return (postId: string, patch: (p: FeedPost) => FeedPost) => {
    queryClient.setQueriesData<InfiniteData<Page>>({ queryKey: ['feed'] }, (data) => {
      if (!data || !('pages' in data)) return data;
      return {
        ...data,
        pages: data.pages.map((pg) => ({
          ...pg,
          posts: pg.posts.map((p) => (p.id === postId ? patch(p) : p)),
        })),
      };
    });
    queryClient.setQueryData<FeedPost | null>(feedKeys.post(postId), (p) => (p ? patch(p) : p));
  };
}

/** Like / unlike with an optimistic update; the database keeps the real count. */
export function useToggleLike() {
  const me = useUserId();
  const patch = usePatchPost();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const { error } = liked
        ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', me)
        : await supabase.from('post_likes').insert({ post_id: postId, user_id: me });
      if (error) throw error;
    },
    onMutate: ({ postId, liked }) =>
      patch(postId, (p) => ({ ...p, liked: !liked, like_count: p.like_count + (liked ? -1 : 1) })),
    onError: (_e, { postId, liked }) =>
      patch(postId, (p) => ({ ...p, liked, like_count: p.like_count + (liked ? 1 : -1) })),
  });
}

export type NewPost = {
  kind: 'post' | 'question';
  body: string;
  communityId: string | null;
  images: PickedImage[];
};

/** Creates the post, then strips EXIF/resizes and uploads images under its id. */
export function useCreatePost() {
  const me = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, body, communityId, images }: NewPost) => {
      const prepared = await Promise.all(images.map(prepareImage));
      const { data, error } = await supabase
        .from('posts')
        .insert({ author_id: me, community_id: communityId, kind, body: body.trim() })
        .select('id')
        .single();
      if (error) throw error;
      const postId = data.id;
      try {
        for (const [position, image] of prepared.entries()) {
          const path = await uploadPostImage(postId, image, position);
          const { error: mediaError } = await supabase.from('post_media').insert({
            post_id: postId,
            storage_path: path,
            width: image.width,
            height: image.height,
            position,
          });
          if (mediaError) throw mediaError;
        }
      } catch (uploadError) {
        // Don't leave a half-made post behind.
        await supabase.rpc('delete_post', { p_post: postId });
        throw uploadError;
      }
      return postId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.rpc('delete_post', { p_post: postId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useAddComment(postId: string) {
  const me = useUserId();
  const queryClient = useQueryClient();
  const patch = usePatchPost();
  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId: string | null }) => {
      const { error } = await supabase
        .from('comments')
        .insert({ post_id: postId, author_id: me, parent_id: parentId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      patch(postId, (p) => ({ ...p, comment_count: p.comment_count + 1 }));
      void queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  const patch = usePatchPost();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.rpc('delete_comment', { p_comment: commentId });
      if (error) throw error;
    },
    onSuccess: () => {
      patch(postId, (p) => ({ ...p, comment_count: Math.max(p.comment_count - 1, 0) }));
      void queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    },
  });
}
