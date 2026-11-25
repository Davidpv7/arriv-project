import { StyleSheet, View } from 'react-native';

import { Card, Header, Screen, Stamp, Text, type IconName } from '@/components/ds';
import { space } from '@/theme/tokens';

/** Placeholder for tabs built in later phases. */
export function ComingSoon({
  title,
  body,
  stamp,
  icon,
}: {
  title: string;
  body: string;
  stamp: string;
  icon: IconName;
}) {
  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header title={title} />
        <Card>
          <View style={styles.row}>
            <Stamp label={stamp} size="lg" fill="sunshine" icon={icon} direction={-1} />
          </View>
          <Text variant="body">{body}</Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  row: { alignItems: 'flex-start', paddingVertical: space[2] },
});
