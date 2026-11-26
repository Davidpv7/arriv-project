import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Header, Icon, Screen, Text } from '@/components/ds';
import { useDocuments, useFolders } from '@/features/backpack/api';
import { DocumentRow } from '@/features/backpack/components/DocumentRow';
import { folderName } from '@/features/backpack/rules';
import { useLinkDocument, useMilestoneDocuments, useUnlinkDocument } from '@/features/journey/api';
import { colors, space } from '@/theme/tokens';

/** Tick Backpack documents to link them to this milestone. Linking shares nothing. */
export default function LinkDocumentsScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const folders = useFolders();
  const documents = useDocuments();
  const linked = useMilestoneDocuments(id);
  const link = useLinkDocument();
  const unlink = useUnlinkDocument();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/journey/${id}`));
  const linkedIds = new Set((linked.data ?? []).map((d) => d.id));
  const docs = documents.data ?? [];
  const groups = (folders.data ?? [])
    .map((folder) => ({ folder, docs: docs.filter((d) => d.folder_id === folder.id) }))
    .filter((g) => g.docs.length > 0);
  const busy = link.isPending || unlink.isPending;

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('journey.link.eyebrow')}
          title={t('journey.link.title')}
        />
        <Text variant="body" color="muted">
          {t('journey.link.body')}
        </Text>
        {folders.isPending || documents.isPending || linked.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : folders.isError || documents.isError || linked.isError ? (
          <Text variant="body" color="muted">
            {t('common.error')}
          </Text>
        ) : groups.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {t('journey.link.empty')}
            </Text>
          </Card>
        ) : (
          groups.map(({ folder, docs: inFolder }) => (
            <View key={folder.id} style={styles.section}>
              <Text variant="label" color="rust" accessibilityRole="header">
                {folderName(t, folder)}
              </Text>
              <Card flush>
                {inFolder.map((doc, i) => {
                  const isLinked = linkedIds.has(doc.id);
                  return (
                    <View key={doc.id}>
                      {i > 0 && <Divider />}
                      <DocumentRow
                        doc={doc}
                        context={isLinked ? t('journey.link.linked') : undefined}
                        right={
                          <Icon
                            name={isLinked ? 'check' : 'plus'}
                            color={isLinked ? 'teal' : 'muted'}
                          />
                        }
                        onPress={() => {
                          if (busy) return;
                          const vars = { milestoneId: id, documentId: doc.id };
                          if (isLinked) unlink.mutate(vars);
                          else link.mutate(vars);
                        }}
                      />
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}
        {(link.isError || unlink.isError) && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {t('common.error')}
          </Text>
        )}
        <Button label={t('common.done')} fullWidth onPress={goBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
});
