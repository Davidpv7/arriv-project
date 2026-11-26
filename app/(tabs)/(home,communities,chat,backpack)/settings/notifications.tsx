import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Divider, Header, Notice, Screen, SwitchRow, Text } from '@/components/ds';
import { PUSH_KINDS, usePushSettings, useSetPushSetting } from '@/features/notifications/api';
import { pushStatus } from '@/lib/notifications';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

/** Which pushes I get. The in-app list always shows everything. */
export default function PushSettingsScreen() {
  const { t } = useTranslation();
  const settings = usePushSettings();
  const set = useSetPushSetting();
  const status = useQuery({ queryKey: ['push-status'], queryFn: pushStatus });

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('notifications.push.eyebrow')}
          title={t('notifications.push.title')}
        />
        <Text variant="body" color="muted">
          {t('notifications.push.intro')}
        </Text>
        {status.data === 'denied' && (
          <Notice eyebrow={t('notifications.push.title')} body={t('notifications.push.off')} />
        )}
        {status.data === 'unavailable' && (
          <Text variant="meta" color="muted">
            {t('notifications.push.unavailable')}
          </Text>
        )}
        {settings.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : settings.isError ? (
          <Text variant="body" color="muted">
            {t('common.error')}
          </Text>
        ) : (
          <Card flush>
            {PUSH_KINDS.map((kind, i) => (
              <View key={kind}>
                {i > 0 && <Divider />}
                <SwitchRow
                  label={t(`notifications.push.kinds.${kind}.label`)}
                  description={t(`notifications.push.kinds.${kind}.hint`)}
                  value={settings.data?.[kind] ?? true}
                  onValueChange={(on) => set.mutate({ kind, on })}
                />
              </View>
            ))}
          </Card>
        )}
        {set.isError && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {t('common.error')}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
});
