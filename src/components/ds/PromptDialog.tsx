import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Button } from './Button';
import { Input } from './Input';
import { Text } from './Text';

export type PromptDialogProps = {
  visible: boolean;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  maxLength?: number;
  confirmLabel: string;
  cancelLabel: string;
  /** Called with the trimmed value; the confirm button is disabled while it's empty. */
  onConfirm: (value: string) => void;
  onCancel: () => void;
  loading?: boolean;
  /** Shown under the field (e.g. the server refused the name). */
  error?: string;
  hint?: string;
  /** An extra, quieter action under the field (e.g. "Use the original name"). */
  secondary?: { label: string; onPress: () => void };
};

/** Ask for one short piece of text: name a folder, rename a document. Works on web. */
export function PromptDialog(props: PromptDialogProps) {
  // Mounting the body only while visible resets the field each time it opens.
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onCancel}>
      {props.visible && <PromptBody {...props} />}
    </Modal>
  );
}

function PromptBody({
  title,
  label,
  initialValue = '',
  placeholder,
  maxLength,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
  error,
  hint,
  secondary,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  const submit = () => {
    if (trimmed && !loading) onConfirm(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={cancelLabel}>
        <Pressable style={styles.card} accessibilityViewIsModal>
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          <Input
            label={label}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            error={error}
            hint={hint}
          />
          {secondary && (
            <Button label={secondary.label} variant="secondary" onPress={secondary.onPress} />
          )}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            <Button label={confirmLabel} onPress={submit} loading={loading} disabled={!trimmed} />
          </View>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
