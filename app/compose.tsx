import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  Header,
  IconButton,
  Input,
  Notice,
  PhotoGrid,
  Screen,
  Text,
} from '@/components/ds';
import { useJoinedCommunities } from '@/features/communities/api';
import { useCreatePost } from '@/features/feed/api';
import { MAX_IMAGES, pickImages, type PickedImage } from '@/features/feed/images';
import { space } from '@/theme/tokens';

const MAX_BODY = 2000;
type Kind = 'post' | 'question';

/** Composer modal: postcard or question, to a crew or to your profile, with up to 4 photos. */
export default function Compose() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ community?: string }>();
  const joined = useJoinedCommunities();
  const create = useCreatePost();

  const [kind, setKind] = useState<Kind>('post');
  const [communityId, setCommunityId] = useState<string | null>(params.community ?? null);
  const [body, setBody] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState<string>();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const remaining = MAX_BODY - body.length;

  const addPhotos = async () => {
    try {
      const picked = await pickImages(MAX_IMAGES - images.length);
      setImages((current) => [...current, ...picked].slice(0, MAX_IMAGES));
    } catch {
      setError(t('compose.errors.photos'));
    }
  };

  const send = () => {
    setError(undefined);
    if (!body.trim()) return setError(t('compose.errors.body'));
    if (body.length > MAX_BODY) return setError(t('compose.errors.tooLong'));
    create.mutate(
      { kind, body, communityId, images },
      {
        onSuccess: (postId) => {
          router.dismiss();
          router.push(`/post/${postId}`);
        },
        onError: () => setError(t('common.error')),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll edges={['top', 'bottom']}>
        <View style={styles.stack}>
          <View style={styles.top}>
            <Header eyebrow={t('compose.eyebrow')} title={t('compose.title')} />
            <IconButton icon="close" accessibilityLabel={t('compose.close')} onPress={close} />
          </View>

          <View style={styles.group}>
            <Text variant="label" color="muted">
              {t('compose.kind')}
            </Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {(['post', 'question'] as const).map((k) => (
                <Chip
                  key={k}
                  label={t(`compose.kinds.${k}`)}
                  selected={kind === k}
                  onPress={() => setKind(k)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text variant="label" color="muted">
              {t('compose.where')}
            </Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {(joined.data ?? []).map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={communityId === c.id}
                  onPress={() => setCommunityId(c.id)}
                />
              ))}
              <Chip
                label={t('compose.profile')}
                selected={communityId === null}
                onPress={() => setCommunityId(null)}
              />
            </View>
            {joined.data?.length === 0 && (
              <Text variant="meta" color="muted">
                {t('compose.noCrews')}
              </Text>
            )}
          </View>

          <Input
            label={t('compose.body')}
            placeholder={
              kind === 'question' ? t('compose.questionPlaceholder') : t('compose.bodyPlaceholder')
            }
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={MAX_BODY}
            hint={remaining < 200 ? t('compose.remaining', { count: remaining }) : undefined}
          />

          <PhotoGrid
            photos={images.map((img, i) => ({ id: `${i}-${img.uri}`, uri: img.uri }))}
            labelFor={(n, total) => t('feed.imageA11y', { n: n + 1, total })}
            onRemove={(n) => setImages((current) => current.filter((_, i) => i !== n))}
            removeLabel={(n) => t('compose.removePhoto', { n: n + 1 })}
          />
          {images.length < MAX_IMAGES && (
            <View style={styles.group}>
              <Button
                label={t('compose.addPhotos')}
                variant="secondary"
                icon="plus"
                onPress={() => void addPhotos()}
              />
              <Text variant="meta" color="muted">
                {t('compose.photosHint')}
              </Text>
            </View>
          )}

          <Notice eyebrow={t('notice.customsEyebrow')} body={t('compose.notice')} tone="sky" />
          {error ? (
            <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button
            label={create.isPending ? t('compose.sending') : t('compose.send')}
            icon="send"
            iconPosition="end"
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={send}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[5] },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
