import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export const MAX_IMAGES = 4;
const MAX_EDGE = 2048;

export type PickedImage = { uri: string; width: number; height: number };

/** Pick up to `limit` photos from the library. Returns [] if cancelled. */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  return result.assets
    .slice(0, limit)
    .map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

/**
 * Resize to at most 2048px on the long edge and re-encode as JPEG.
 * Re-encoding drops EXIF metadata, including GPS location (spec §5).
 */
export async function prepareImage(image: PickedImage): Promise<PickedImage> {
  const context = ImageManipulator.manipulate(image.uri);
  const longEdge = Math.max(image.width, image.height);
  if (longEdge > MAX_EDGE) {
    context.resize(image.width >= image.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** Uploads one prepared image to post-media/{postId}/{n}.jpg and returns the path. */
export async function uploadPostImage(postId: string, image: PickedImage, position: number) {
  const path = `${postId}/${position}-${Date.now()}.jpg`;
  const body = await (await fetch(image.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('post-media')
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** Signed URLs (1 hour) for post images. Path → URL. */
export async function signPostImages(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from('post-media').createSignedUrls(paths, 3600);
  if (error) throw error;
  return new Map(
    data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : [])),
  );
}
