import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Header, ListRow, Notice, Screen, Text } from '@/components/ds';
import { useSignOut } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { useIsAdmin, useOpenReportCount } from '@/features/safety/api';
import { space } from '@/theme/tokens';

export default function Settings() {
  const { t } = useTranslation();
  const { session } = useSession();
  const signOut = useSignOut();
  const isAdmin = useIsAdmin();
  const openReports = useOpenReportCount();

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          backLabel={t('common.back')}
          title={t('settings.title')}
        />

        <View style={styles.section}>
          <Text variant="label" color="rust" accessibilityRole="header">
            {t('settings.account')}
          </Text>
          <Card flush>
            <ListRow
              icon="edit"
              title={t('profile.edit')}
              onPress={() => router.push('/profile/edit')}
            />
            <Divider />
            <ListRow
              icon="communities"
              title={t('profile.viewConnections')}
              onPress={() => router.push('/connections')}
            />
            <Divider />
            <ListRow
              icon="bell"
              title={t('settings.notifications')}
              onPress={() => router.push('/settings/notifications')}
            />
          </Card>
          <Text variant="meta" color="muted">
            {t('settings.signedInAs', { email: session?.user.email ?? '' })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="label" color="rust" accessibilityRole="header">
            {t('settings.privacy')}
          </Text>
          <Card flush>
            <ListRow
              icon="lock"
              title={t('settings.blocked')}
              onPress={() => router.push('/settings/blocked')}
            />
          </Card>
          <Notice eyebrow={t('settings.privacy')} body={t('settings.privacyNote')} tone="sky" />
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text variant="label" color="rust" accessibilityRole="header">
              {t('settings.admin')}
            </Text>
            <Card flush>
              <ListRow
                icon="settings"
                title={t('admin.reports')}
                meta={
                  openReports.data != null
                    ? t('admin.reportsMeta', { count: openReports.data })
                    : undefined
                }
                onPress={() => router.push('/settings/reports')}
              />
            </Card>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={t('settings.signOut')}
            variant="dark"
            fullWidth
            loading={signOut.isPending}
            onPress={() => signOut.mutate()}
          />
          <Button
            label={t('deleteAccount.link')}
            variant="secondary"
            fullWidth
            onPress={() => router.push('/settings/delete')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[6] },
  section: { gap: space[3] },
  actions: { gap: space[3] },
});
