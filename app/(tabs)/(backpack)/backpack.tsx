import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Divider,
  Header,
  Icon,
  LuggageTag,
  PromptDialog,
  Screen,
  Text,
  useIsWide,
} from '@/components/ds';
import {
  isFolderLimit,
  useCreateFolder,
  useDocuments,
  useFolders,
  type BackpackFolder,
} from '@/features/backpack/api';
import { DocumentRow } from '@/features/backpack/components/DocumentRow';
import { FOLDER_NAME_MAX, folderName, tagCode } from '@/features/backpack/rules';
import { colors, space, type FillColor } from '@/theme/tokens';

const TAG_FILLS: FillColor[] = ['tangerine', 'sky', 'sunshine', 'card'];
const RECENT = 5;

export default function BackpackTab() {
  const { t } = useTranslation();
  const folders = useFolders();
  const documents = useDocuments();
  const [naming, setNaming] = useState(false);
  const create = useCreateFolder();

  const byId = new Map((folders.data ?? []).map((f) => [f.id, f]));
  const recent = (documents.data ?? []).slice(0, RECENT);
  const failed = folders.isError || documents.isError;
  const wide = useIsWide();

  return (
    <Screen scroll maxWidth={wide ? 1120 : undefined}>
      <View style={styles.stack}>
        <Header eyebrow={t('backpack.eyebrow')} title={t('backpack.title')} />
        <View style={styles.privacy}>
          <Icon name="lock" size={18} color="teal" />
          <Text variant="meta" color="muted" style={styles.flex}>
            {t('backpack.privacy')}
          </Text>
        </View>
        <Button
          label={t('backpack.pack')}
          icon="plus"
          fullWidth={!wide}
          onPress={() => router.push('/backpack-upload')}
        />

        {failed && (
          <Card>
            <Text variant="body">{t('common.error')}</Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => {
                void folders.refetch();
                void documents.refetch();
              }}
            />
          </Card>
        )}

        {wide ? (
          // Desktop: luggage tags on the left, the recent receipt on the right.
          <View style={styles.columns}>
            <View style={styles.flex}>
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text variant="label" color="rust" accessibilityRole="header" style={styles.flex}>
                    {t('backpack.folders')}
                  </Text>
                  <Button
                    label={t('backpack.newFolder')}
                    variant="secondary"
                    icon="plus"
                    onPress={() => {
                      create.reset();
                      setNaming(true);
                    }}
                  />
                </View>
                {folders.isPending ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <View style={[styles.tags, styles.tagsLeft]}>
                    {(folders.data ?? []).map((folder, i) => (
                      <FolderTag key={folder.id} folder={folder} index={i} />
                    ))}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.receipt}>
              <View style={styles.section}>
                <Text variant="label" color="rust" accessibilityRole="header">
                  {t('backpack.recent')}
                </Text>
                {documents.isPending ? (
                  <ActivityIndicator color={colors.navy} />
                ) : recent.length === 0 ? (
                  <Card>
                    <Text variant="body" color="muted">
                      {t('backpack.empty')}
                    </Text>
                  </Card>
                ) : (
                  <Card flush>
                    {recent.map((doc, i) => {
                      const folder = byId.get(doc.folder_id);
                      return (
                        <View key={doc.id}>
                          {i > 0 && <Divider />}
                          <DocumentRow
                            doc={doc}
                            context={folder ? folderName(t, folder) : undefined}
                            onPress={() => router.push(`/document/${doc.id}`)}
                          />
                        </View>
                      );
                    })}
                  </Card>
                )}
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text variant="label" color="rust" accessibilityRole="header" style={styles.flex}>
                  {t('backpack.folders')}
                </Text>
                <Button
                  label={t('backpack.newFolder')}
                  variant="secondary"
                  icon="plus"
                  onPress={() => {
                    create.reset();
                    setNaming(true);
                  }}
                />
              </View>
              {folders.isPending ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <View style={styles.tags}>
                  {(folders.data ?? []).map((folder, i) => (
                    <FolderTag key={folder.id} folder={folder} index={i} />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text variant="label" color="rust" accessibilityRole="header">
                {t('backpack.recent')}
              </Text>
              {documents.isPending ? (
                <ActivityIndicator color={colors.navy} />
              ) : recent.length === 0 ? (
                <Card>
                  <Text variant="body" color="muted">
                    {t('backpack.empty')}
                  </Text>
                </Card>
              ) : (
                <Card flush>
                  {recent.map((doc, i) => {
                    const folder = byId.get(doc.folder_id);
                    return (
                      <View key={doc.id}>
                        {i > 0 && <Divider />}
                        <DocumentRow
                          doc={doc}
                          context={folder ? folderName(t, folder) : undefined}
                          onPress={() => router.push(`/document/${doc.id}`)}
                        />
                      </View>
                    );
                  })}
                </Card>
              )}
            </View>
          </>
        )}
      </View>

      <PromptDialog
        visible={naming}
        title={t('backpack.folder.newTitle')}
        label={t('backpack.folder.nameLabel')}
        placeholder={t('backpack.folder.namePlaceholder')}
        maxLength={FOLDER_NAME_MAX}
        confirmLabel={t('backpack.folder.create')}
        cancelLabel={t('common.cancel')}
        loading={create.isPending}
        error={
          create.isError
            ? isFolderLimit(create.error)
              ? t('backpack.folder.limit')
              : t('common.error')
            : undefined
        }
        onCancel={() => setNaming(false)}
        onConfirm={(name) =>
          create.mutate(name, {
            onSuccess: (id) => {
              setNaming(false);
              router.push(`/folder/${id}`);
            },
          })
        }
      />
    </Screen>
  );
}

function FolderTag({ folder, index }: { folder: BackpackFolder; index: number }) {
  const { t } = useTranslation();
  return (
    <LuggageTag
      code={tagCode(index)}
      name={folderName(t, folder)}
      countLabel={t('backpack.files', { count: folder.count })}
      fill={TAG_FILLS[index % TAG_FILLS.length]}
      direction={index % 2 === 0 ? -1 : 1}
      onPress={() => router.push(`/folder/${folder.id}`)}
    />
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space[6] + space[2] },
  receipt: { width: 420 },
  tagsLeft: { justifyContent: 'flex-start' },
  stack: { gap: space[5] },
  flex: { flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  section: { gap: space[3] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[4],
    paddingVertical: space[2],
  },
});
