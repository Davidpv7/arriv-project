import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  ActionSheet,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  FileChip,
  Header,
  Icon,
  IconButton,
  PromptDialog,
  Screen,
  Text,
  type ActionSheetAction,
} from '@/components/ds';
import {
  useDeleteDocument,
  useDocument,
  useDocumentUrl,
  useFolders,
  useUpdateDocument,
  type BackpackDocument,
} from '@/features/backpack/api';
import {
  DOCUMENT_NAME_MAX,
  fileNameFor,
  folderName,
  isImageDocument,
  sizeLabel,
  typeLabel,
} from '@/features/backpack/rules';
import { relativeTime } from '@/features/feed/format';
import { colors, radius, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/backpack'));

export default function DocumentScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const doc = useDocument(id);

  if (doc.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  if (!doc.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header
            onBack={goBack}
            backLabel={t('common.back')}
            title={t('backpack.document.notFound')}
          />
          <Text variant="body" color="muted">
            {doc.isError ? t('common.error') : t('backpack.document.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }
  return <DocumentDetail doc={doc.data} />;
}

type Dialog = 'menu' | 'rename' | 'move' | 'delete' | null;

function DocumentDetail({ doc }: { doc: BackpackDocument }) {
  const { t } = useTranslation();
  const folders = useFolders();
  const url = useDocumentUrl(doc);
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const [dialog, setDialog] = useState<Dialog>(null);

  const folder = folders.data?.find((f) => f.id === doc.folder_id);
  const image = isImageDocument(doc.mime_type);
  const open = () => {
    if (url.data) void WebBrowser.openBrowserAsync(url.data);
  };

  const goSend = () => {
    setDialog(null);
    router.push(`/document/${doc.id}/send`);
  };
  const menu: ActionSheetAction[] = [
    { label: t('backpack.document.rename'), onPress: () => setDialog('rename') },
    { label: t('backpack.document.move'), onPress: () => setDialog('move') },
    { label: t('backpack.document.send'), onPress: () => goSend() },
    { label: t('backpack.document.delete'), destructive: true, onPress: () => setDialog('delete') },
  ];
  const moveTo: ActionSheetAction[] = (folders.data ?? [])
    .filter((f) => f.id !== doc.folder_id)
    .map((f) => ({
      label: folderName(t, f),
      onPress: () =>
        update.mutate({ id: doc.id, folder_id: f.id }, { onSuccess: () => setDialog(null) }),
    }));

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={folder ? folderName(t, folder) : undefined}
          title={doc.name}
          right={
            <IconButton
              icon="more"
              accessibilityLabel={t('backpack.document.options')}
              onPress={() => setDialog('menu')}
            />
          }
        />

        {image ? (
          <Pressable
            onPress={open}
            disabled={!url.data}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('backpack.document.previewA11y', { name: doc.name })}
            style={styles.preview}
          >
            {url.data ? (
              <Image
                source={{ uri: url.data }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="none"
              />
            ) : url.isError ? (
              <Text variant="meta" color="muted" align="center">
                {t('backpack.document.previewError')}
              </Text>
            ) : (
              <ActivityIndicator color={colors.navy} />
            )}
          </Pressable>
        ) : (
          <Card>
            <FileChip
              fileName={fileNameFor(doc.name, doc.mime_type)}
              background="card"
              onPress={open}
            />
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            label={t('backpack.document.open')}
            icon="external"
            fullWidth
            onPress={open}
            disabled={!url.data}
          />
          <Button
            label={t('backpack.document.send')}
            variant="secondary"
            icon="send"
            fullWidth
            onPress={goSend}
          />
        </View>

        <Card flush>
          <Detail
            label={t('backpack.document.folder')}
            value={folder ? folderName(t, folder) : '—'}
          />
          <Divider />
          <Detail label={t('backpack.document.type')} value={typeLabel(doc.mime_type)} />
          <Divider />
          <Detail label={t('backpack.document.size')} value={sizeLabel(doc.size_bytes)} />
          <Divider />
          <Detail label={t('backpack.document.packed')} value={relativeTime(t, doc.created_at)} />
        </Card>

        <View style={styles.privacy}>
          <Icon name="lock" size={18} color="teal" />
          <Text variant="meta" color="muted">
            {t('backpack.document.privacy')}
          </Text>
        </View>
        {update.isError && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {t('common.error')}
          </Text>
        )}
      </View>

      <ActionSheet
        visible={dialog === 'menu'}
        title={doc.name}
        actions={menu}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDialog(null)}
      />
      <ActionSheet
        visible={dialog === 'move'}
        title={t('backpack.document.moveTitle')}
        actions={moveTo}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDialog(null)}
      />
      <PromptDialog
        visible={dialog === 'rename'}
        title={t('backpack.document.rename')}
        label={t('backpack.document.nameLabel')}
        initialValue={doc.name}
        maxLength={DOCUMENT_NAME_MAX}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        loading={update.isPending}
        error={update.isError ? t('common.error') : undefined}
        onCancel={() => setDialog(null)}
        onConfirm={(name) =>
          update.mutate({ id: doc.id, name }, { onSuccess: () => setDialog(null) })
        }
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={t('backpack.document.deleteTitle')}
        body={remove.isError ? t('common.error') : t('backpack.document.deleteBody')}
        confirmLabel={t('backpack.document.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          remove.mutate(doc, {
            onSuccess: () => {
              setDialog(null);
              goBack();
            },
          })
        }
      />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <Text variant="body" style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  preview: {
    height: 360,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  actions: { gap: space[3] },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
