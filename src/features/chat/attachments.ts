import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';

import { pickImages, prepareImage } from '@/features/feed/images';
import { supabase } from '@/lib/supabase';

import {
  AttachmentError,
  attachmentProblem,
  FILE_MIME,
  isImageMime,
  safeFileName,
  type PickedAttachment,
} from './rules';

export * from './rules';

const BUCKET = 'chat-attachments';

/** One photo from the library. */
export async function pickChatImage(): Promise<PickedAttachment | null> {
  const [image] = await pickImages(1);
  if (!image) return null;
  return { ...image, name: 'photo.jpg', mime: 'image/jpeg', size: null };
}

/** One PDF or Word document. */
export async function pickChatFile(): Promise<PickedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...FILE_MIME],
    multiple: false,
    copyToCacheDirectory: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    name: asset.name,
    mime: asset.mimeType ?? 'application/octet-stream',
    size: asset.size ?? null,
  };
}

/**
 * Uploads to chat-attachments/{conversationId}/{uuid}-{name}. Photos are resized and
 * re-encoded first, which strips EXIF location (spec §5). Returns what the message row needs.
 */
export async function uploadChatAttachment(conversationId: string, picked: PickedAttachment) {
  const image = isImageMime(picked.mime);
  const ready = image
    ? await prepareImage({ uri: picked.uri, width: picked.width ?? 0, height: picked.height ?? 0 })
    : null;
  const uri = ready?.uri ?? picked.uri;
  const mime = image ? 'image/jpeg' : picked.mime;
  const name = image ? picked.name.replace(/\.[^.]+$/, '') + '.jpg' : picked.name;

  const body = await (await fetch(uri)).arrayBuffer();
  const problem = attachmentProblem({ mime, size: body.byteLength });
  if (problem) throw new AttachmentError(problem);

  const path = `${conversationId}/${Crypto.randomUUID()}-${safeFileName(name)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mime, upsert: false });
  if (error) throw error;
  return { attachment_path: path, attachment_name: name.slice(0, 200), attachment_mime: mime };
}

export async function removeChatAttachment(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Signed URLs (1 hour) for chat attachments. Path -> URL. */
export async function signChatAttachments(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  return new Map(
    data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : [])),
  );
}
