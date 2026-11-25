/** Pure attachment rules (no native modules), shared by the uploader and the composer. */

const MB = 1024 * 1024;

/** Spec §5: images 10 MB, files 20 MB. Matches the chat-attachments bucket's allowed types. */
export const IMAGE_MAX_BYTES = 10 * MB;
export const FILE_MAX_BYTES = 20 * MB;
export const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const FILE_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Something picked to send, before upload. */
export type PickedAttachment = {
  uri: string;
  name: string;
  mime: string;
  size: number | null;
  width?: number;
  height?: number;
};

export type AttachmentProblem = 'type' | 'imageTooBig' | 'fileTooBig';

export const isImageMime = (mime: string | null | undefined) =>
  !!mime && (IMAGE_MIME as readonly string[]).includes(mime);

/** Why this can't be sent, or null if it can. Keys map to chat.attachment.* in i18n. */
export function attachmentProblem(
  a: Pick<PickedAttachment, 'mime' | 'size'>,
): AttachmentProblem | null {
  const image = isImageMime(a.mime);
  if (!image && !(FILE_MIME as readonly string[]).includes(a.mime)) return 'type';
  if (a.size != null && a.size > (image ? IMAGE_MAX_BYTES : FILE_MAX_BYTES)) {
    return image ? 'imageTooBig' : 'fileTooBig';
  }
  return null;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/** A storage-safe file name that keeps the extension: "My lease (v2).pdf" -> "my-lease-v2.pdf". */
export function safeFileName(fullName: string): string {
  const name = fullName.split(/[\\/]/).pop() ?? ''; // drop any folder part
  const dot = name.lastIndexOf('.');
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 8)
      : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  const safeBase = base || 'file';
  return ext ? `${safeBase}.${ext}` : safeBase;
}

export class AttachmentError extends Error {
  constructor(public readonly problem: AttachmentProblem) {
    super(`Attachment rejected: ${problem}`);
    this.name = 'AttachmentError';
  }
}
