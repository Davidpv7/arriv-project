/** Pure Backpack rules (no native modules), shared by the uploader, screens and tests. */

import type { Tables } from '@/types/database';

const MB = 1024 * 1024;

/** Spec §3.5 / §5: 20 MB per file. Matches the backpack bucket's limit and allowed types. */
export const DOCUMENT_MAX_BYTES = 20 * MB;
export const DOCUMENT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const FOLDER_NAME_MAX = 40;
export const DOCUMENT_NAME_MAX = 120;

/** Signed URLs for Backpack files last 5 minutes (spec §5). */
export const SIGNED_URL_SECONDS = 300;

export type DocumentProblem = 'type' | 'tooBig';

/** Why this can't go in the Backpack, or null if it can. Keys map to backpack.problem.* */
export function documentProblem(a: { mime: string; size: number | null }): DocumentProblem | null {
  if (!(DOCUMENT_MIME as readonly string[]).includes(a.mime)) return 'type';
  if (a.size != null && a.size > DOCUMENT_MAX_BYTES) return 'tooBig';
  return null;
}

export class DocumentError extends Error {
  constructor(public readonly problem: DocumentProblem) {
    super(`Document rejected: ${problem}`);
    this.name = 'DocumentError';
  }
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Photos (shown inline) versus files (opened). */
export const isImageDocument = (mime: string) => mime.startsWith('image/');

export const extensionFor = (mime: string) => EXTENSIONS[mime] ?? '';

/** Short type label shown on receipts: "PDF", "JPG", "DOCX". */
export const typeLabel = (mime: string) => (extensionFor(mime) || 'file').toUpperCase();

/** "Lease (signed).pdf" -> "Lease (signed)": the suggested display name for an upload. */
export function nameFromFile(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).trim().slice(0, DOCUMENT_NAME_MAX);
}

/** The display name with its extension, for downloads and chat copies: "Passport.pdf". */
export function fileNameFor(name: string, mime: string): string {
  const ext = extensionFor(mime);
  if (!ext) return name;
  return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
}

/** "48 KB", "2.1 MB". Bytes are always under 20 MB here. */
export function sizeLabel(bytes: number): string {
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Luggage-tag code from the folder's place in the list: "TAG 001". */
export const tagCode = (index: number) => `TAG ${String(index + 1).padStart(3, '0')}`;

export type Folder = Pick<Tables<'backpack_folders'>, 'id' | 'kind' | 'name' | 'position'>;
export type FolderKind = NonNullable<Folder['kind']>;

/** Default folders show their translated name until renamed. */
export function folderName(
  t: (key: `backpack.folderKinds.${FolderKind}`) => string,
  folder: Pick<Folder, 'kind' | 'name'>,
): string {
  if (folder.name) return folder.name;
  return t(`backpack.folderKinds.${folder.kind ?? 'other'}`);
}

/** Default folders first (in their set order), then your own by position, then age. */
export function sortFolders<T extends Folder & { created_at: string }>(folders: T[]): T[] {
  return [...folders].sort(
    (a, b) =>
      Number(a.kind === null) - Number(b.kind === null) ||
      a.position - b.position ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** A cleaned folder or document name, or null if nothing is left. */
export function cleanName(value: string, max: number): string | null {
  const name = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return name.length > 0 ? name : null;
}
