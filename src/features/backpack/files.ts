import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { pickImages, prepareImage } from '@/features/feed/images';
import { supabase } from '@/lib/supabase';

import {
  DOCUMENT_MIME,
  DocumentError,
  SIGNED_URL_SECONDS,
  documentProblem,
  isImageDocument,
} from './rules';

export * from './rules';

const BUCKET = 'backpack';

/** Something picked to pack, before upload. */
export type PickedDocument = {
  uri: string;
  /** Original file name, used to suggest the display name. */
  fileName: string;
  mime: string;
  size: number | null;
  width?: number;
  height?: number;
};

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission denied');
    this.name = 'CameraPermissionError';
  }
}

/** Take a photo of a document. */
export async function takeDocumentPhoto(): Promise<PickedDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionError();
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    fileName: '',
    mime: 'image/jpeg',
    size: null,
    width: asset.width,
    height: asset.height,
  };
}

/** One photo from the library. */
export async function pickDocumentPhoto(): Promise<PickedDocument | null> {
  const [image] = await pickImages(1);
  if (!image) return null;
  return { ...image, fileName: '', mime: 'image/jpeg', size: null };
}

/** One PDF, Word document or image from Files. */
export async function pickDocumentFile(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...DOCUMENT_MIME],
    multiple: false,
    copyToCacheDirectory: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    fileName: asset.name,
    mime: asset.mimeType ?? 'application/octet-stream',
    size: asset.size ?? null,
  };
}

/**
 * Uploads to backpack/{ownerId}/{new document id} and returns both. Photos are
 * re-encoded first, which strips EXIF location (spec §5). The database copies the
 * type and size from the stored file when the document row is added.
 */
export async function uploadDocumentFile(ownerId: string, picked: PickedDocument) {
  const image = isImageDocument(picked.mime);
  const early = documentProblem(picked);
  if (early) throw new DocumentError(early);

  const ready = image
    ? await prepareImage({ uri: picked.uri, width: picked.width ?? 0, height: picked.height ?? 0 })
    : null;
  const mime = image ? 'image/jpeg' : picked.mime;
  const body = await (await fetch(ready?.uri ?? picked.uri)).arrayBuffer();
  const problem = documentProblem({ mime, size: body.byteLength });
  if (problem) throw new DocumentError(problem);

  const id = Crypto.randomUUID();
  const path = `${ownerId}/${id}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mime, upsert: false });
  if (error) throw error;
  return { id, path, mime, size: body.byteLength };
}

export async function removeDocumentFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** A 5-minute signed URL. With `downloadAs`, the browser saves it under that name. */
export async function signDocument(path: string, downloadAs?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Copies a Backpack file into chat-attachments/{conversationId}/{uuid}-{name}. The
 * original stays owner-only; only the copy is visible to the chat (spec §3.4).
 */
export async function copyDocumentToChat(
  storagePath: string,
  conversationId: string,
  safeName: string,
) {
  const target = `${conversationId}/${Crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .copy(storagePath, target, { destinationBucket: 'chat-attachments' });
  if (error) throw error;
  return target;
}
