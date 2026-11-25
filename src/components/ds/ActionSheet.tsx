import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Button } from './Button';
import { Text } from './Text';

export type ActionSheetAction = {
  label: string;
  onPress: () => void;
  /** Destructive actions use the dark button so they aren't the bright default. */
  destructive?: boolean;
};

export type ActionSheetProps = {
  visible: boolean;
  title: string;
  actions: ActionSheetAction[];
  cancelLabel: string;
  onCancel: () => void;
};

/** A short list of actions (long-press on a message). Cross-platform, works on web. */
export function ActionSheet({ visible, title, actions, cancelLabel, onCancel }: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={cancelLabel}>
        <Pressable style={styles.card} accessibilityViewIsModal>
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.actions}>
            {actions.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                variant={a.destructive ? 'dark' : 'secondary'}
                fullWidth
                onPress={a.onPress}
              />
            ))}
            <Button label={cancelLabel} variant="secondary" fullWidth onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: space[5],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius.ticket,
    padding: space[5],
    gap: space[3],
  },
  actions: { gap: space[2] },
});
