import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  BoardingPass,
  Button,
  Card,
  ListScreen,
  Screen,
  Stamp,
  Text,
} from '@/components/ds';
import { useHomeFeed } from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { useMilestones } from '@/features/journey/api';
import { useMyProfile, type ProfileWithVisa } from '@/features/profile/api';
import { boardingPass, initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

export default function Home() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const feed = useHomeFeed();

  if (!profile) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }

  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <ListScreen
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={<HomeHeader profile={profile} />}
      ListEmptyComponent={
        feed.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : feed.isError ? (
          <Text variant="body">{t('common.error')}</Text>
        ) : (
          <Card>
            <Text variant="body">{t('feed.empty')}</Text>
            <Button label={t('feed.findCrews')} onPress={() => router.navigate('/communities')} />
          </Card>
        )
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <ActivityIndicator color={colors.navy} style={styles.footer} />
        ) : posts.length > 0 && !feed.hasNextPage ? (
          <Text variant="label" color="muted" align="center" style={styles.footer}>
            {t('feed.end')}
          </Text>
        ) : undefined
      }
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => void feed.refetch()}
    />
  );
}

function HomeHeader({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const pass = boardingPass(profile);
  const firstName = profile.display_name.split(' ')[0];
  const milestones = useMilestones();
  const stampCount = milestones.data?.filter((m) => m.status === 'done').length;
  const openProfile = () => router.push(`/profile/${profile.handle}`);

  return (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <View style={styles.flex}>
          <Text variant="label" color="rust">
            {t('home.eyebrow')}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {t('home.greeting', { name: firstName })}
          </Text>
        </View>
        <Pressable
          onPress={openProfile}
          accessibilityRole="link"
          accessibilityLabel={t('home.profileA11y')}
          hitSlop={8}
        >
          <Avatar
            initials={initials(profile.display_name)}
            uri={avatarUrl(profile.avatar_path)}
            size={44}
            fill="sky"
          />
        </Pressable>
      </View>
      <Pressable
        onPress={openProfile}
        accessibilityRole="link"
        accessibilityLabel={t('home.profileA11y')}
      >
        <BoardingPass
          eyebrowStart={t('boardingPass.eyebrow')}
          eyebrowEnd={t('boardingPass.carrier')}
          name={profile.display_name}
          from={{ code: pass.from, city: pass.fromName }}
          to={{ code: pass.to, city: pass.toName }}
          fields={[
            { label: t('boardingPass.visa'), value: pass.visa ?? t('home.noVisa') },
            { label: t('boardingPass.day'), value: pass.day ? String(pass.day) : t('home.noDay') },
            {
              label: t('boardingPass.stamps'),
              value: stampCount == null ? '—' : String(stampCount),
            },
          ]}
          showPlane
        />
      </Pressable>
      <View style={styles.shortcuts}>
        <Stamp
          size="lg"
          label={t('home.journey')}
          icon="plane"
          fill="sunshine"
          direction={-1}
          accessibilityLabel={t('home.journeyA11y')}
          onPress={() => router.push('/journey')}
        />
        <Stamp
          size="lg"
          label={t('home.passport')}
          icon="globe"
          fill="sky"
          accessibilityLabel={t('home.passportA11y')}
          onPress={openProfile}
        />
        {/* Visas joins in Phase 6. Three fit on a phone: when Lawyers comes (after v1) it replaces Passport. */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[5], marginBottom: space[5] },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
  shortcuts: { flexDirection: 'row', gap: space[4], paddingHorizontal: space[1] },
  footer: { marginVertical: space[5] },
});
