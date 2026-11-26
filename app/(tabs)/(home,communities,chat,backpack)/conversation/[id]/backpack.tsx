import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, ConfirmDialog, Divider, Header, Screen, Text } from '@/components/ds';
import { useDocuments, useFolders, type BackpackDocument } from '@/features/backpack/api';
import { DocumentRow } from '@/features/backpack/components/DocumentRow';
import { folderName } from '@/features/backpack/rules';
import { useSendDocumentCopy } from '@/features/chat/api';
import { colors, space } from '@/theme/tokens';

const isNoPermission = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === '42501';

/** From the chat composer: pick a Backpack document, confirm, send a copy here. */
export default function SendFromBackpackScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const folders = useFolders();
  const documents = useDocuments();
  const send = useSendDocumentCopy();
  const [picked, setPicked] = useState<BackpackDocument | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/conversation/${id}`));
  const docs = documents.data ?? [];
  const groups = (folders.data ?? [])
    .map((folder) => ({ folder, docs: docs.filter((d) => d.folder_id === folder.id) }))
    .filter((g) => g.docs.length > 0);

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('backpack.picker.eyebrow')}
          title={t('backpack.picker.title')}
        />
        <Text variant="body" color="muted">
          {t('backpack.picker.body')}
        </Text>
        {folders.isPending || documents.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : folders.isError || documents.isError ? (
          <Text variant="body" color="muted">
            {t('common.error')}
          </Text>
        ) : groups.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {t('backpack.picker.empty')}
            </Text>
          </Card>
        ) : (
          groups.map(({ folder, docs: inFolder }) => (
            <View key={folder.id} style={styles.section}>
              <Text variant="label" color="rust" accessibilityRole="header">
                {folderName(t, folder)}
              </Text>
              <Card flush>
                {inFolder.map((doc, i) => (
                  <View key={doc.id}>
                    {i > 0 && <Divider />}
                    <DocumentRow
                      doc={doc}
                      onPress={() => {
                        send.reset();
                        setPicked(doc);
                      }}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </View>

      <ConfirmDialog
        visible={!!picked}
        title={t('backpack.picker.confirmTitle', { name: picked?.name ?? '' })}
        body={
          send.isError
            ? isNoPermission(send.error)
              ? t('chat.composer.blocked')
              : t('common.error')
            : t('backpack.send.confirmBody')
        }
        confirmLabel={t('backpack.send.confirm')}
        cancelLabel={t('common.cancel')}
        loading={send.isPending}
        onCancel={() => setPicked(null)}
        onConfirm={() =>
          picked &&
          send.mutate(
            { conversationId: id, doc: picked },
            {
              onSuccess: () => {
                setPicked(null);
                goBack();
              },
            },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
});
