import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  Header,
  ListScreen,
  Screen,
  Stamp,
  Text,
} from '@/components/ds';
import {
  useCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  useMyMemberships,
  type Community,
} from '@/features/communities/api';
import { usePostList } from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { asStampColor, communityInitials, gateCode } from '@/features/feed/format';
import { colors, radius, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/communities'));

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const community = useCommunity(slug);

  if (community.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  if (!community.data) {
    return (
      <Screen scroll>
        <Header onBack={goBack} backLabel={t('common.back')} title={t('communities.notFound')} />
      </Screen>
    );
  }
  return <CommunityFeed community={community.data} />;
}

function CommunityFeed({ community }: { community: Community }) {
  const { t } = useTranslation();
  const posts = usePostList({ communityId: community.id });
  const items = posts.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <ListScreen
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={<GateSign community={community} />}
      ListEmptyComponent={
        posts.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : (
          <Card>
            <Text variant="body" color="muted">
              {t('communities.noPosts')}
            </Text>
          </Card>
        )
      }
      onEndReached={() => {
        if (posts.hasNextPage && !posts.isFetchingNextPage) void posts.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={posts.isRefetching && !posts.isFetchingNextPage}
      onRefresh={() => void posts.refetch()}
    />
  );
}

/** Header styled as an airport gate sign. */
function GateSign({ community }: { community: Community }) {
  const { t } = useTranslation();
  const memberships = useMyMemberships();
  const join = useJoinCommunity();
  const leave = useLeaveCommunity();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const role = memberships.data?.get(community.id);

  return (
    <View style={styles.header}>
      <Header onBack={goBack} backLabel={t('common.back')} />
      <View style={styles.sign}>
        <View style={styles.signTop}>
          <View style={styles.flex}>
            <Text variant="label" color="sunshine">
              {`${t('communities.gate', { code: gateCode(community.city) })} · ${t('communities.onBoard', { count: community.member_count })}`}
            </Text>
            <Text variant="title" color="onNavy" accessibilityRole="header">
              {community.name}
            </Text>
            <Text variant="label" color="onNavyMuted">
              {t(`communities.kinds.${community.kind}`)}
            </Text>
          </View>
          <Stamp
            label={communityInitials(community.name)}
            fill={asStampColor(community.stamp_color)}
            tilt="md"
            accessibilityLabel={community.name}
          />
        </View>
        {community.description ? (
          <Text variant="body" color="onNavy">
            {community.description}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {!role && (
            <Button
              label={t('communities.join')}
              loading={join.isPending}
              onPress={() => join.mutate(community.id)}
            />
          )}
          {role && (
            <Button
              label={t('communities.writePostcard')}
              icon="plus"
              onPress={() =>
                router.push({ pathname: '/compose', params: { community: community.id } })
              }
            />
          )}
          {role === 'owner' && (
            <Text variant="meta" color="onNavyMuted">
              {t('communities.owner')}
            </Text>
          )}
          {role && role !== 'owner' && (
            <Button
              label={t('communities.leave')}
              variant="onNavy"
              onPress={() => setConfirmLeave(true)}
            />
          )}
        </View>
        {(join.error || leave.error) && (
          <Text variant="meta" color="sunshine">
            {t('common.error')}
          </Text>
        )}
      </View>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('communities.posts')}
      </Text>
      <ConfirmDialog
        visible={confirmLeave}
        title={t('communities.leaveTitle', { name: community.name })}
        body={t('communities.leaveBody')}
        confirmLabel={t('communities.leave')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={leave.isPending}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => leave.mutate(community.id, { onSuccess: () => setConfirmLeave(false) })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[4], marginBottom: space[4] },
  sign: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: space[5],
    gap: space[3],
  },
  signTop: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  flex: { flex: 1, gap: space[1] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], alignItems: 'center' },
});
