import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  ActionSheet,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Header,
  IconButton,
  PromptDialog,
  Screen,
  Text,
  type ActionSheetAction,
} from '@/components/ds';
import {
  isFolderNotEmpty,
  useDeleteFolder,
  useDocuments,
  useFolders,
  useRenameFolder,
  type BackpackFolder,
} from '@/features/backpack/api';
import { DocumentRow } from '@/features/backpack/components/DocumentRow';
import { FOLDER_NAME_MAX, folderName, tagCode } from '@/features/backpack/rules';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/backpack'));

export default function FolderScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const folders = useFolders();

  if (folders.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  const index = folders.data?.findIndex((f) => f.id === id) ?? -1;
  const folder = folders.data?.[index];
  if (!folder) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header onBack={goBack} backLabel={t('common.back')} title={t('common.notFound')} />
          {folders.isError && (
            <Text variant="body" color="muted">
              {t('common.error')}
            </Text>
          )}
        </View>
      </Screen>
    );
  }
  return <Folder folder={folder} index={index} />;
}

function Folder({ folder, index }: { folder: BackpackFolder; index: number }) {
  const { t } = useTranslation();
  const documents = useDocuments();
  const rename = useRenameFolder();
  const remove = useDeleteFolder();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notEmpty, setNotEmpty] = useState(false);

  const name = folderName(t, folder);
  const isDefault = folder.kind !== null;
  const docs = (documents.data ?? []).filter((d) => d.folder_id === folder.id);

  const actions: ActionSheetAction[] = [
    {
      label: t('backpack.folder.rename'),
      onPress: () => {
        setMenu(false);
        rename.reset();
        setRenaming(true);
      },
    },
  ];
  if (!isDefault) {
    actions.push({
      label: t('backpack.folder.delete'),
      destructive: true,
      onPress: () => {
        setMenu(false);
        remove.reset();
        if (docs.length > 0) setNotEmpty(true);
        else setConfirmDelete(true);
      },
    });
  }

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={`${tagCode(index)} · ${t('backpack.files', { count: docs.length })}`}
          title={name}
          right={
            <IconButton
              icon="more"
              accessibilityLabel={t('backpack.folder.options')}
              onPress={() => setMenu(true)}
            />
          }
        />
        {isDefault && (
          <Text variant="meta" color="muted">
            {t('backpack.folder.defaultHint')}
          </Text>
        )}
        {notEmpty && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {t('backpack.folder.notEmpty')}
          </Text>
        )}
        <Button
          label={t('backpack.pack')}
          icon="plus"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/backpack-upload', params: { folder: folder.id } })
          }
        />
        {documents.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : documents.isError ? (
          <Card>
            <Text variant="body">{t('common.error')}</Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => void documents.refetch()}
            />
          </Card>
        ) : docs.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {t('backpack.emptyFolder')}
            </Text>
          </Card>
        ) : (
          <Card flush>
            {docs.map((doc, i) => (
              <View key={doc.id}>
                {i > 0 && <Divider />}
                <DocumentRow doc={doc} onPress={() => router.push(`/document/${doc.id}`)} />
              </View>
            ))}
          </Card>
        )}
      </View>

      <ActionSheet
        visible={menu}
        title={name}
        actions={actions}
        cancelLabel={t('common.cancel')}
        onCancel={() => setMenu(false)}
      />
      <PromptDialog
        visible={renaming}
        title={t('backpack.folder.rename')}
        label={t('backpack.folder.nameLabel')}
        initialValue={name}
        maxLength={FOLDER_NAME_MAX}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        loading={rename.isPending}
        error={rename.isError ? t('common.error') : undefined}
        secondary={
          isDefault && folder.name
            ? {
                label: t('backpack.folder.resetName'),
                onPress: () =>
                  rename.mutate(
                    { id: folder.id, name: null },
                    { onSuccess: () => setRenaming(false) },
                  ),
              }
            : undefined
        }
        onCancel={() => setRenaming(false)}
        onConfirm={(value) => {
          // Unchanged: keep a default folder on its translated name rather than saving a copy.
          if (value === name) {
            setRenaming(false);
            return;
          }
          rename.mutate({ id: folder.id, name: value }, { onSuccess: () => setRenaming(false) });
        }}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title={t('backpack.folder.deleteTitle')}
        body={
          remove.isError
            ? isFolderNotEmpty(remove.error)
              ? t('backpack.folder.notEmpty')
              : t('common.error')
            : t('backpack.folder.deleteBody')
        }
        confirmLabel={t('backpack.folder.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(folder.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              goBack();
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
});
