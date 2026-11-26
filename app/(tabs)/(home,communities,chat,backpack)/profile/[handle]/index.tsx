import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import {
  ActionSheet,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Header,
  IconButton,
  ListRow,
  PassportCover,
  Screen,
  Stamp,
  Text,
  useIsWide,
} from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import { useStartDirect } from '@/features/chat/api';
import { useJoinedCommunities } from '@/features/communities/api';
import { usePostList } from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { asStampColor, communityInitials } from '@/features/feed/format';
import { useStamps } from '@/features/journey/api';
import { StampTile } from '@/features/journey/components/StampTile';
import {
  useAcceptConnection,
  useConnectionCount,
  useConnectionState,
  useMyConnections,
  useProfileByHandle,
  useRemoveConnection,
  useRequestConnection,
  type ProfileWithVisa,
} from '@/features/profile/api';
import { initials, monthYear, visaText } from '@/features/profile/format';
import { findCountry } from '@/features/profile/places';
import { useBlockUser } from '@/features/safety/api';
import { ReportDialog } from '@/features/safety/components/ReportDialog';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { handle = '' } = useLocalSearchParams<{ handle: string }>();
  const me = useUserId();
  const profile = useProfileByHandle(handle);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const wide = useIsWide();

  if (profile.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header onBack={goBack} backLabel={t('common.back')} title={t('profile.notFound')} />
          <Text variant="body" color="muted">
            {profile.isError ? t('common.error') : t('profile.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  const p = profile.data;
  const isMe = p.id === me;

  const identity = (
    <>
      <Header
        onBack={goBack}
        backLabel={t('common.back')}
        right={
          isMe ? (
            <IconButton
              icon="settings"
              accessibilityLabel={t('profile.settings')}
              onPress={() => router.push('/settings')}
            />
          ) : (
            <OtherMenu profile={p} />
          )
        }
      />
      <PassportCover
        eyebrow={t('profile.eyebrow')}
        name={p.display_name}
        handle={p.handle}
        initials={initials(p.display_name)}
        avatarUri={avatarUrl(p.avatar_path)}
        route={
          findCountry(p.origin_country)
            ? t('profile.route', { from: findCountry(p.origin_country)!.alpha3 })
            : undefined
        }
        since={
          monthYear(p.arrived_on)
            ? t('profile.since', { date: monthYear(p.arrived_on) })
            : undefined
        }
        bio={p.bio}
      >
        {isMe ? (
          <Button
            label={t('profile.edit')}
            variant="onNavy"
            icon="edit"
            onPress={() => router.push('/profile/edit')}
          />
        ) : (
          <ConnectionActions profile={p} />
        )}
      </PassportCover>

      <Card flush>
        <VisaRow profile={p} isMe={isMe} />
        <Divider />
        <ConnectionsRow profile={p} isMe={isMe} />
      </Card>
    </>
  );
  const activity = (
    <>
      <StampsRow userId={p.id} isMe={isMe} handle={p.handle} name={p.display_name} />
      <CrewsRow userId={p.id} />
      <ProfilePosts authorId={p.id} />
    </>
  );

  // Desktop: passport and details on the left, stamps, crews and postcards on the right.
  if (wide) {
    return (
      <Screen scroll maxWidth={1120}>
        <View style={styles.columns}>
          <View style={[styles.stack, styles.left]}>{identity}</View>
          <View style={[styles.stack, styles.flex]}>{activity}</View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen scroll>
      <View style={styles.stack}>
        {identity}
        {activity}
      </View>
    </Screen>
  );
}

/** Journey stamps this viewer may see (the database applies each stamp's visibility). */
function StampsRow({
  userId,
  isMe,
  handle,
  name,
}: {
  userId: string;
  isMe: boolean;
  handle: string;
  name: string;
}) {
  const { t } = useTranslation();
  const stamps = useStamps(userId);
  const items = stamps.data ?? [];
  if (!isMe && items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('profile.stamps')}
      </Text>
      {items.length === 0 ? (
        <Text variant="meta" color="muted">
          {t('profile.stampsEmpty')}
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.journeyStamps}>
            {items.map((stamp, i) => (
              <StampTile
                key={stamp.id}
                stamp={stamp}
                index={i}
                size={96}
                onPress={() =>
                  router.push(isMe ? `/journey/${stamp.id}` : `/profile/${handle}/journey`)
                }
              />
            ))}
          </View>
        </ScrollView>
      )}
      <Button
        label={
          isMe ? t('profile.myJourney') : t('profile.seeJourney', { name: name.split(' ')[0] })
        }
        variant="secondary"
        onPress={() => router.push(isMe ? '/journey' : `/profile/${handle}/journey`)}
      />
    </View>
  );
}

/** Crews this person has joined, as a row of stamps. */
function CrewsRow({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const crews = useJoinedCommunities(userId);
  if (!crews.data?.length) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('profile.crews')}
      </Text>
      <View style={styles.stamps}>
        {crews.data.map((c, i) => (
          <Stamp
            key={c.id}
            label={communityInitials(c.name)}
            fill={asStampColor(c.stamp_color)}
            direction={i % 2 ? 1 : -1}
            accessibilityLabel={c.name}
            onPress={() => router.push(`/community/${c.slug}`)}
          />
        ))}
      </View>
    </View>
  );
}

/** The person's postcards (first 20; RLS decides what this viewer may see). */
function ProfilePosts({ authorId }: { authorId: string }) {
  const { t } = useTranslation();
  const posts = usePostList({ authorId });
  const items = posts.data?.pages.flatMap((pg) => pg.posts) ?? [];
  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('profile.postcards')}
      </Text>
      {posts.isPending ? (
        <ActivityIndicator color={colors.navy} />
      ) : items.length === 0 ? (
        <Card>
          <Text variant="body" color="muted">
            {t('profile.postcardsEmpty')}
          </Text>
        </Card>
      ) : (
        <>
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {posts.hasNextPage && (
            <Button
              label={t('feed.loadMore')}
              variant="secondary"
              loading={posts.isFetchingNextPage}
              onPress={() => void posts.fetchNextPage()}
            />
          )}
        </>
      )}
    </View>
  );
}

function VisaRow({ profile, isMe }: { profile: ProfileWithVisa; isMe: boolean }) {
  const { t } = useTranslation();
  const text = visaText(profile.visa);
  const subclass = profile.visa?.visa_subclass;
  const title = text
    ? subclass
      ? t('profile.visaSubclass', { subclass })
      : text
    : t('profile.visaHidden');
  const meta =
    isMe && profile.visa
      ? t('profile.visibleTo', { who: t(`visibility.${profile.visa.visibility}`) })
      : t('profile.visa');
  return (
    <ListRow
      icon="document"
      title={title}
      meta={meta}
      onPress={isMe ? () => router.push('/profile/edit') : undefined}
    />
  );
}

function ConnectionsRow({ profile, isMe }: { profile: ProfileWithVisa; isMe: boolean }) {
  const { t } = useTranslation();
  const count = useConnectionCount(profile.id);
  const mine = useMyConnections();
  const incoming = isMe
    ? (mine.data ?? []).filter((c) => c.status === 'pending' && c.direction === 'incoming').length
    : 0;
  return (
    <ListRow
      icon="communities"
      title={t('profile.connections', { count: count.data ?? 0 })}
      meta={isMe && incoming > 0 ? t('profile.requests', { count: incoming }) : undefined}
      onPress={isMe ? () => router.push('/connections') : undefined}
    />
  );
}

function ConnectionActions({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const state = useConnectionState(profile.id);
  const request = useRequestConnection();
  const accept = useAcceptConnection();
  const remove = useRemoveConnection();
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!state.data) return <ActivityIndicator color={colors.onNavy} />;
  const busy = request.isPending || accept.isPending || remove.isPending;

  return (
    <View style={styles.actions}>
      <MessageButton profileId={profile.id} />
      {state.data.kind === 'none' && (
        <Button
          label={t('profile.connect')}
          loading={busy}
          onPress={() => request.mutate(profile.id)}
        />
      )}
      {state.data.kind === 'outgoing' && (
        <Button
          label={t('profile.cancelRequest')}
          variant="onNavy"
          loading={busy}
          onPress={() => remove.mutate(profile.id)}
        />
      )}
      {state.data.kind === 'incoming' && (
        <>
          <Button
            label={t('profile.accept')}
            loading={accept.isPending}
            disabled={busy}
            onPress={() => accept.mutate(profile.id)}
          />
          <Button
            label={t('profile.decline')}
            variant="onNavy"
            disabled={busy}
            onPress={() => remove.mutate(profile.id)}
          />
        </>
      )}
      {state.data.kind === 'connected' && (
        <Button
          label={t('profile.connected')}
          variant="onNavy"
          icon="check"
          onPress={() => setConfirmRemove(true)}
          accessibilityHint={t('profile.remove')}
        />
      )}
      {(request.error || accept.error || remove.error) && (
        <Text variant="meta" color="sunshine">
          {t('common.error')}
        </Text>
      )}
      <ConfirmDialog
        visible={confirmRemove}
        title={t('profile.removeTitle', { name: profile.display_name })}
        body={t('profile.removeBody')}
        confirmLabel={t('profile.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate(profile.id, { onSuccess: () => setConfirmRemove(false) })}
      />
    </View>
  );
}

/** Opens (or starts) the direct chat with this person. */
function MessageButton({ profileId }: { profileId: string }) {
  const { t } = useTranslation();
  const start = useStartDirect();
  return (
    <Button
      label={t('chat.message')}
      icon="chat"
      variant="onNavy"
      loading={start.isPending}
      onPress={() =>
        start.mutate(profileId, { onSuccess: (id) => router.push(`/conversation/${id}`) })
      }
    />
  );
}

function OtherMenu({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const block = useBlockUser();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  return (
    <>
      <IconButton
        icon="more"
        accessibilityLabel={t('profile.moreA11y')}
        onPress={() => setMenu(true)}
      />
      <ActionSheet
        visible={menu}
        title={profile.display_name}
        actions={[
          {
            label: t('report.action'),
            onPress: () => {
              setMenu(false);
              setReporting(true);
            },
          },
          {
            label: t('profile.block'),
            destructive: true,
            onPress: () => {
              setMenu(false);
              setOpen(true);
            },
          },
        ]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setMenu(false)}
      />
      <ReportDialog
        target={reporting ? { type: 'profile', id: profile.id } : null}
        onClose={() => setReporting(false)}
      />
      <ConfirmDialog
        visible={open}
        title={t('profile.blockTitle', { name: profile.display_name })}
        body={t('profile.blockBody')}
        confirmLabel={t('profile.block')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={block.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          block.mutate(profile.id, {
            onSuccess: () => {
              setOpen(false);
              router.replace('/');
            },
          })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space[6] + space[2] },
  left: { width: 400 },
  flex: { flex: 1 },
  section: { gap: space[3] },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4], paddingVertical: space[1] },
  journeyStamps: { flexDirection: 'row', gap: space[2], paddingVertical: space[2] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], alignItems: 'center' },
});
