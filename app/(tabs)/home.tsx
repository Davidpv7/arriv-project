import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, BoardingPass, Card, Screen, Text } from '@/components/ds';
import { useMyProfile } from '@/features/profile/api';
import { boardingPass, initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

export default function Home() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();

  if (!profile) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }

  const pass = boardingPass(profile);
  const firstName = profile.display_name.split(' ')[0];

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="label" color="rust">
              {t('home.eyebrow')}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {t('home.greeting', { name: firstName })}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/profile/${profile.handle}`)}
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
          onPress={() => router.push(`/profile/${profile.handle}`)}
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
              {
                label: t('boardingPass.day'),
                value: pass.day ? String(pass.day) : t('home.noDay'),
              },
              { label: t('boardingPass.stamps'), value: '0' },
            ]}
            showPlane
          />
        </Pressable>

        <Card>
          <Text variant="heading">{t('home.feedTitle')}</Text>
          <Text variant="body" color="muted">
            {t('home.feedBody')}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
});
