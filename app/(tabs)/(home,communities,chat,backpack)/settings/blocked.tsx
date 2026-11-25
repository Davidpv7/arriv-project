import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Header, ListRow, Screen, Text } from '@/components/ds';
import { initials } from '@/features/profile/format';
import { useMyBlocks, useUnblockUser } from '@/features/safety/api';
import { colors, space } from '@/theme/tokens';

export default function BlockedPeople() {
  const { t } = useTranslation();
  const { data, isPending, isError } = useMyBlocks();
  const unblock = useUnblockUser();

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          backLabel={t('common.back')}
          title={t('settings.blocked')}
        />
        {isPending && <ActivityIndicator color={colors.navy} />}
        {isError && <Text variant="body">{t('common.error')}</Text>}
        {data && data.length === 0 && (
          <Card>
            <Text variant="body" color="muted">
              {t('settings.blockedEmpty')}
            </Text>
          </Card>
        )}
        {data && data.length > 0 && (
          <Card flush>
            {data.map((b, i) => (
              <View key={b.blocked_id}>
                {i > 0 && <Divider />}
                <ListRow
                  title={b.display_name}
                  meta={`@${b.handle}`}
                  avatar={{ initials: initials(b.display_name) }}
                  right={
                    <Button
                      label={t('settings.unblock')}
                      variant="secondary"
                      loading={unblock.isPending && unblock.variables === b.blocked_id}
                      onPress={() => unblock.mutate(b.blocked_id)}
                    />
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
});
