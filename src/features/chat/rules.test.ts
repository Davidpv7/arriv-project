import {
  FILE_MAX_BYTES,
  IMAGE_MAX_BYTES,
  attachmentProblem,
  isImageMime,
  safeFileName,
} from './rules';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('attachmentProblem', () => {
  it('accepts photos, PDFs and Word documents within the limits', () => {
    expect(attachmentProblem({ mime: 'image/jpeg', size: 2_000_000 })).toBeNull();
    expect(attachmentProblem({ mime: 'image/heic', size: null })).toBeNull();
    expect(attachmentProblem({ mime: 'application/pdf', size: FILE_MAX_BYTES })).toBeNull();
    expect(attachmentProblem({ mime: DOCX, size: 1 })).toBeNull();
  });

  it('rejects other file types', () => {
    expect(attachmentProblem({ mime: 'application/zip', size: 10 })).toBe('type');
    expect(attachmentProblem({ mime: 'video/mp4', size: 10 })).toBe('type');
    expect(attachmentProblem({ mime: 'application/msword', size: 10 })).toBe('type');
  });

  it('caps images at 10 MB and files at 20 MB', () => {
    expect(attachmentProblem({ mime: 'image/png', size: IMAGE_MAX_BYTES + 1 })).toBe('imageTooBig');
    expect(attachmentProblem({ mime: 'application/pdf', size: IMAGE_MAX_BYTES + 1 })).toBeNull();
    expect(attachmentProblem({ mime: 'application/pdf', size: FILE_MAX_BYTES + 1 })).toBe(
      'fileTooBig',
    );
  });
});

describe('isImageMime', () => {
  it('tells images from files', () => {
    expect(isImageMime('image/webp')).toBe(true);
    expect(isImageMime('application/pdf')).toBe(false);
    expect(isImageMime(null)).toBe(false);
  });
});

describe('safeFileName', () => {
  it('keeps the extension and makes the rest storage-safe', () => {
    expect(safeFileName('My lease (v2).pdf')).toBe('my-lease-v2.pdf');
    expect(safeFileName('Contrato São Paulo.DOCX')).toBe('contrato-sao-paulo.docx');
  });

  it('falls back to "file" when nothing usable is left', () => {
    expect(safeFileName('合同.pdf')).toBe('file.pdf');
    expect(safeFileName('.env')).toBe('env');
    expect(safeFileName('')).toBe('file');
  });

  it('never produces a path separator and stays short', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\ana\\visa grant.pdf')).toBe('visa-grant.pdf');
    const long = safeFileName(`${'a'.repeat(200)}.pdf`);
    expect(long.length).toBeLessThanOrEqual(64);
    expect(long.endsWith('.pdf')).toBe(true);
  });
});
