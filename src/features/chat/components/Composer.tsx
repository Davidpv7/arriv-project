import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FileChip, IconButton, Input, Text } from '@/components/ds';
import {
  AttachmentError,
  attachmentProblem,
  pickChatFile,
  pickChatImage,
  type AttachmentProblem,
  type PickedAttachment,
} from '@/features/chat/attachments';
import { colors, space } from '@/theme/tokens';

export type ComposerEdit = { id: number; body: string };

type ComposerError =
  `chat.attachment.${AttachmentProblem}` | 'chat.composer.blocked' | 'common.error';

type Props = {
  onSend: (draft: { body: string; attachment: PickedAttachment | null }) => Promise<unknown>;
  onSaveEdit: (edit: ComposerEdit) => Promise<unknown>;
  editing: ComposerEdit | null;
  onCancelEdit: () => void;
  busy: boolean;
  /** An error to show from outside the composer (e.g. messages failed to load). */
  error: ComposerError | null;
};

const isNoPermission = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === '42501';

/** Bottom bar: photo, file, message, paper-plane send. Edit mode reuses the same field. */
export function Composer({ onSend, onSaveEdit, editing, onCancelEdit, busy, error }: Props) {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<PickedAttachment | null>(null);
  const [problem, setProblem] = useState<ComposerError | null>(null);

  // Starting to edit a message loads its text (adjusting state during render, not in an effect).
  const [editingId, setEditingId] = useState<number | null>(null);
  if ((editing?.id ?? null) !== editingId) {
    setEditingId(editing?.id ?? null);
    if (editing) {
      setBody(editing.body);
      setAttachment(null);
    }
  }

  const pick = async (picker: () => Promise<PickedAttachment | null>) => {
    setProblem(null);
    const picked = await picker();
    if (!picked) return;
    const issue = attachmentProblem(picked);
    if (issue) {
      setProblem(`chat.attachment.${issue}`);
      return;
    }
    setAttachment(picked);
  };

  const canSend = !busy && (body.trim().length > 0 || (!editing && attachment !== null));

  const submit = async () => {
    if (!canSend) return;
    setProblem(null);
    try {
      if (editing) {
        await onSaveEdit({ id: editing.id, body });
      } else {
        await onSend({ body, attachment });
      }
      setBody('');
      setAttachment(null);
    } catch (e) {
      if (e instanceof AttachmentError) setProblem(`chat.attachment.${e.problem}`);
      else if (isNoPermission(e)) setProblem('chat.composer.blocked');
      else setProblem('common.error');
    }
  };

  const shownError = problem ?? error;

  return (
    <View style={styles.wrap}>
      {editing && (
        <View style={styles.banner}>
          <Text variant="label" color="rust" style={styles.flex}>
            {t('chat.composer.editing')}
          </Text>
          <IconButton
            icon="close"
            accessibilityLabel={t('chat.composer.cancelEdit')}
            onPress={() => {
              setBody('');
              onCancelEdit();
            }}
          />
        </View>
      )}
      {attachment && (
        <View style={styles.attachment}>
          <View style={styles.flex}>
            <FileChip
              fileName={attachment.name}
              fill="sunshine"
              background="card"
              accessibilityLabel={attachment.name}
            />
            <Text variant="meta" color="muted">
              {t('chat.attachment.shareWarning')}
            </Text>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel={t('chat.composer.removeAttachment')}
            onPress={() => setAttachment(null)}
          />
        </View>
      )}
      {shownError && (
        <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
          {t(shownError)}
        </Text>
      )}
      <View style={styles.bar}>
        {!editing && (
          <>
            <IconButton
              icon="image"
              accessibilityLabel={t('chat.composer.addPhoto')}
              onPress={() => void pick(pickChatImage)}
              disabled={busy}
            />
            <IconButton
              icon="attach"
              accessibilityLabel={t('chat.composer.addFile')}
              onPress={() => void pick(pickChatFile)}
              disabled={busy}
            />
          </>
        )}
        <View style={styles.flex}>
          <Input
            label={t('chat.composer.label')}
            hideLabel
            placeholder={t('chat.composer.placeholder')}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={4000}
            style={styles.field}
          />
        </View>
        <IconButton
          icon={editing ? 'check' : 'send'}
          filled
          accessibilityLabel={editing ? t('chat.composer.save') : t('chat.composer.send')}
          onPress={() => void submit()}
          disabled={!canSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
    paddingHorizontal: space[3],
    paddingTop: space[2],
    paddingBottom: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.paper,
  },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1] },
  field: { minHeight: 48, maxHeight: 140, paddingTop: space[3] },
  banner: { flexDirection: 'row', alignItems: 'center', paddingLeft: space[2] },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: space[2],
  },
});
