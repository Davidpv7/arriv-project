import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Button } from './Button';
import { Text } from './Text';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** Destructive actions use the dark button so they aren't the bright default. */
  destructive?: boolean;
};

/** Cross-platform confirm dialog (Alert buttons don't work on web). */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
  destructive,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={cancelLabel}>
        <Pressable style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <Text variant="heading">{title}</Text>
          {body ? <Text variant="body">{body}</Text> : null}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'dark' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
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
    justifyContent: 'center',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[2],
  },
});
