import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, FileChip, Header, Icon, Input, Screen, Text } from '@/components/ds';
import { useAddDocument, useFolders } from '@/features/backpack/api';
import {
  CameraPermissionError,
  DocumentError,
  documentProblem,
  pickDocumentFile,
  pickDocumentPhoto,
  takeDocumentPhoto,
  type DocumentProblem,
  type PickedDocument,
} from '@/features/backpack/files';
import {
  DOCUMENT_NAME_MAX,
  cleanName,
  folderName,
  isImageDocument,
  nameFromFile,
} from '@/features/backpack/rules';
import { colors, radius, space } from '@/theme/tokens';

type UploadError =
  | `backpack.problem.${DocumentProblem}`
  | 'backpack.upload.cameraDenied'
  | 'backpack.upload.nameRequired'
  | 'common.error';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/backpack'));

/** Pack a document: take or choose it, name it, pick a folder. Opens it when done. */
export default function UploadScreen() {
  const { t } = useTranslation();
  const { folder: initialFolder } = useLocalSearchParams<{ folder?: string }>();
  const folders = useFolders();
  const add = useAddDocument();

  const [picked, setPicked] = useState<PickedDocument | null>(null);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string | null>(initialFolder ?? null);
  const [error, setError] = useState<UploadError | null>(null);

  const choose = async (picker: () => Promise<PickedDocument | null>) => {
    setError(null);
    try {
      const next = await picker();
      if (!next) return;
      const problem = documentProblem(next);
      if (problem) {
        setError(`backpack.problem.${problem}`);
        return;
      }
      setPicked(next);
      if (!name.trim()) setName(nameFromFile(next.fileName));
    } catch (e) {
      setError(
        e instanceof CameraPermissionError ? 'backpack.upload.cameraDenied' : 'common.error',
      );
    }
  };

  const submit = () => {
    if (!picked || !folderId) return;
    const clean = cleanName(name, DOCUMENT_NAME_MAX);
    if (!clean) {
      setError('backpack.upload.nameRequired');
      return;
    }
    setError(null);
    add.mutate(
      { picked, name: clean, folderId },
      {
        onSuccess: (doc) => router.replace(`/document/${doc.id}`),
        onError: (e) =>
          setError(e instanceof DocumentError ? `backpack.problem.${e.problem}` : 'common.error'),
      },
    );
  };

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('backpack.upload.eyebrow')}
          title={t('backpack.upload.title')}
        />

        {picked ? (
          <Card>
            <View style={styles.picked}>
              {isImageDocument(picked.mime) ? (
                <Image
                  source={{ uri: picked.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  accessibilityLabel={t('backpack.upload.photoPicked')}
                />
              ) : (
                <FileChip fileName={picked.fileName} fill="sunshine" background="card" />
              )}
              <Button
                label={t('backpack.upload.change')}
                variant="secondary"
                onPress={() => setPicked(null)}
                disabled={add.isPending}
              />
            </View>
          </Card>
        ) : (
          <View style={styles.section}>
            <Text variant="label" color="rust" accessibilityRole="header">
              {t('backpack.upload.source')}
            </Text>
            <Button
              label={t('backpack.upload.camera')}
              variant="secondary"
              icon="image"
              fullWidth
              onPress={() => void choose(takeDocumentPhoto)}
            />
            <Button
              label={t('backpack.upload.photo')}
              variant="secondary"
              icon="image"
              fullWidth
              onPress={() => void choose(pickDocumentPhoto)}
            />
            <Button
              label={t('backpack.upload.file')}
              variant="secondary"
              icon="document"
              fullWidth
              onPress={() => void choose(pickDocumentFile)}
            />
            <Text variant="meta" color="muted">
              {t('backpack.upload.hint')}
            </Text>
          </View>
        )}

        {picked && (
          <>
            <Input
              label={t('backpack.upload.nameLabel')}
              placeholder={t('backpack.upload.namePlaceholder')}
              value={name}
              onChangeText={setName}
              maxLength={DOCUMENT_NAME_MAX}
              autoFocus={!name}
            />
            <View style={styles.section}>
              <Text variant="label" color="muted">
                {t('backpack.upload.folderLabel')}
              </Text>
              {folders.isPending ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {(folders.data ?? []).map((f) => (
                    <Chip
                      key={f.id}
                      label={folderName(t, f)}
                      selected={folderId === f.id}
                      onPress={() => setFolderId(f.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {error && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {t(error)}
          </Text>
        )}

        {picked && (
          <View style={styles.section}>
            <Button
              label={t('backpack.upload.submit')}
              icon="check"
              fullWidth
              size="lg"
              loading={add.isPending}
              disabled={!folderId || !name.trim()}
              onPress={submit}
            />
            <View style={styles.privacy}>
              <Icon name="lock" size={18} color="teal" />
              <Text variant="meta" color="muted">
                {t('backpack.upload.privateNote')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
  picked: { gap: space[3], alignItems: 'flex-start' },
  thumb: { width: 120, height: 150, borderRadius: radius.postcard, backgroundColor: colors.paper },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
