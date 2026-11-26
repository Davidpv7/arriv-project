import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  ActionSheet,
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Header,
  IconButton,
  Input,
  Screen,
  Text,
} from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import { useMyMemberships } from '@/features/communities/api';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useDeletePost,
  usePost,
  type Comment,
} from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { relativeTime } from '@/features/feed/format';
import { initials } from '@/features/profile/format';
import { ReportDialog } from '@/features/safety/components/ReportDialog';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function PostScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  const post = usePost(id);
  const memberships = useMyMemberships();
  const deletePost = useDeletePost();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (post.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  if (!post.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header onBack={goBack} backLabel={t('common.back')} title={t('post.notFound')} />
          <Text variant="body" color="muted">
            {t('post.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  const p = post.data;
  const isAuthor = p.author_id === me;
  const role = p.community_id ? memberships.data?.get(p.community_id) : undefined;
  const isMod = role === 'owner' || role === 'moderator';
  const canDelete = isAuthor || isMod;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll edges={['top']}>
        <View style={styles.stack}>
          <Header
            onBack={goBack}
            backLabel={t('common.back')}
            right={
              <IconButton
                icon="more"
                accessibilityLabel={t('post.moreA11y')}
                onPress={() => setMenu(true)}
              />
            }
          />
          <PostCard post={p} compact={false} />
          <Comments postId={p.id} canModerate={isMod} />
        </View>
        <ActionSheet
          visible={menu}
          title={t('post.title')}
          actions={[
            ...(isAuthor
              ? []
              : [
                  {
                    label: t('report.action'),
                    onPress: () => {
                      setMenu(false);
                      setReporting(true);
                    },
                  },
                ]),
            ...(canDelete
              ? [
                  {
                    label: isAuthor ? t('feed.deletePost') : t('feed.removePost'),
                    destructive: true,
                    onPress: () => {
                      setMenu(false);
                      setConfirmDelete(true);
                    },
                  },
                ]
              : []),
          ]}
          cancelLabel={t('common.cancel')}
          onCancel={() => setMenu(false)}
        />
        <ReportDialog
          target={reporting ? { type: 'post', id: p.id } : null}
          onClose={() => setReporting(false)}
        />
        <ConfirmDialog
          visible={confirmDelete}
          title={isAuthor ? t('feed.deleteTitle') : t('feed.removeTitle')}
          body={t('feed.deleteBody')}
          confirmLabel={isAuthor ? t('feed.deletePost') : t('feed.removePost')}
          cancelLabel={t('common.cancel')}
          destructive
          loading={deletePost.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            deletePost.mutate(p.id, {
              onSuccess: () => {
                setConfirmDelete(false);
                goBack();
              },
            })
          }
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Comments({ postId, canModerate }: { postId: string; canModerate: boolean }) {
  const { t } = useTranslation();
  const me = useUserId();
  const comments = useComments(postId);
  const add = useAddComment(postId);
  const remove = useDeleteComment(postId);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);

  const all = comments.data ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const replies = (id: string) => all.filter((c) => c.parent_id === id);

  const send = () => {
    if (!body.trim()) return;
    add.mutate(
      { body, parentId: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setBody('');
          setReplyTo(null);
        },
      },
    );
  };

  const renderComment = (c: Comment, isReply: boolean) => (
    <View key={c.id} style={[styles.comment, isReply && styles.reply]}>
      <Pressable
        onPress={() => c.author && router.push(`/profile/${c.author.handle}`)}
        accessibilityRole="link"
        accessibilityLabel={c.author?.display_name}
      >
        <Avatar
          initials={initials(c.author?.display_name ?? '?')}
          uri={avatarUrl(c.author?.avatar_path)}
          size={isReply ? 28 : 36}
          fill="sky"
        />
      </Pressable>
      <View style={styles.commentBody}>
        <Text variant="meta">
          {c.author?.display_name}
          <Text variant="label" color="muted">
            {`  ${relativeTime(t, c.created_at)}`}
          </Text>
        </Text>
        <Text variant="body">{c.body}</Text>
        <View style={styles.commentActions}>
          {!isReply && (
            <Pressable
              onPress={() => setReplyTo(c)}
              accessibilityRole="button"
              hitSlop={10}
              style={styles.textButton}
            >
              <Text variant="label" color="rust">
                {t('post.reply')}
              </Text>
            </Pressable>
          )}
          {c.author_id !== me && (
            <Pressable
              onPress={() => setReporting(c.id)}
              accessibilityRole="button"
              hitSlop={10}
              style={styles.textButton}
            >
              <Text variant="label" color="muted">
                {t('report.action')}
              </Text>
            </Pressable>
          )}
          {(c.author_id === me || canModerate) && (
            <Pressable
              onPress={() => setToDelete(c.id)}
              accessibilityRole="button"
              hitSlop={10}
              style={styles.textButton}
            >
              <Text variant="label" color="muted">
                {t('post.delete')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('post.comments')}
      </Text>
      <Card>
        {comments.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : topLevel.length === 0 ? (
          <Text variant="body" color="muted">
            {t('post.noComments')}
          </Text>
        ) : (
          topLevel.map((c) => (
            <View key={c.id} style={styles.thread}>
              {renderComment(c, false)}
              {replies(c.id).map((r) => renderComment(r, true))}
            </View>
          ))
        )}
      </Card>

      <View style={styles.composer}>
        {replyTo && (
          <View style={styles.replying}>
            <Text variant="meta" color="muted" style={styles.flex}>
              {t('post.replyingTo', { name: replyTo.author?.display_name ?? '' })}
            </Text>
            <IconButton
              icon="close"
              accessibilityLabel={t('post.cancelReply')}
              onPress={() => setReplyTo(null)}
            />
          </View>
        )}
        <Input
          label={t('post.write')}
          placeholder={t('post.writePlaceholder')}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={1000}
          error={add.error ? t('common.error') : undefined}
        />
        <Button
          label={t('post.send')}
          icon="send"
          iconPosition="end"
          disabled={!body.trim()}
          loading={add.isPending}
          onPress={send}
        />
      </View>

      <ConfirmDialog
        visible={!!toDelete}
        title={t('post.deleteCommentTitle')}
        confirmLabel={t('post.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete && remove.mutate(toDelete, { onSuccess: () => setToDelete(null) })
        }
      />
      <ReportDialog
        target={reporting ? { type: 'comment', id: reporting } : null}
        onClose={() => setReporting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[5] },
  section: { gap: space[3] },
  thread: { gap: space[3] },
  comment: { flexDirection: 'row', gap: space[3] },
  reply: { marginLeft: space[6] + space[2] },
  commentBody: { flex: 1, gap: 2 },
  commentActions: { flexDirection: 'row', gap: space[4] },
  textButton: { minHeight: 32, justifyContent: 'center' },
  composer: { gap: space[3] },
  replying: { flexDirection: 'row', alignItems: 'center' },
});
