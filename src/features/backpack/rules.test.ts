import {
  DOCUMENT_MAX_BYTES,
  cleanName,
  documentProblem,
  fileNameFor,
  folderName,
  nameFromFile,
  sizeLabel,
  sortFolders,
  tagCode,
  typeLabel,
} from './rules';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('documentProblem', () => {
  it('accepts photos, PDFs and Word documents up to 20 MB', () => {
    expect(documentProblem({ mime: 'application/pdf', size: DOCUMENT_MAX_BYTES })).toBeNull();
    expect(documentProblem({ mime: 'image/heic', size: null })).toBeNull();
    expect(documentProblem({ mime: DOCX, size: 1 })).toBeNull();
  });

  it('rejects other types and anything over 20 MB', () => {
    expect(documentProblem({ mime: 'application/zip', size: 1 })).toBe('type');
    expect(documentProblem({ mime: 'application/msword', size: 1 })).toBe('type');
    expect(documentProblem({ mime: 'image/jpeg', size: DOCUMENT_MAX_BYTES + 1 })).toBe('tooBig');
  });
});

describe('names', () => {
  it('suggests a display name from the file name', () => {
    expect(nameFromFile('Lease (signed).pdf')).toBe('Lease (signed)');
    expect(nameFromFile('/var/mobile/tmp/Police check.PDF')).toBe('Police check');
    expect(nameFromFile('.hidden')).toBe('.hidden');
  });

  it('adds the extension once for downloads and chat copies', () => {
    expect(fileNameFor('Passport', 'application/pdf')).toBe('Passport.pdf');
    expect(fileNameFor('scan.JPG', 'image/jpeg')).toBe('scan.JPG');
    expect(fileNameFor('CV', DOCX)).toBe('CV.docx');
  });

  it('cleans names and refuses empty ones', () => {
    expect(cleanName('  Rental   docs ', 40)).toBe('Rental docs');
    expect(cleanName('   ', 40)).toBeNull();
    expect(cleanName('a'.repeat(50), 40)).toHaveLength(40);
  });
});

describe('labels', () => {
  it('formats sizes, types and tag codes', () => {
    expect(sizeLabel(48_213)).toBe('47 KB');
    expect(sizeLabel(10)).toBe('1 KB');
    expect(sizeLabel(2.1 * 1024 * 1024)).toBe('2.1 MB');
    expect(typeLabel('application/pdf')).toBe('PDF');
    expect(typeLabel('text/plain')).toBe('FILE');
    expect(tagCode(0)).toBe('TAG 001');
    expect(tagCode(11)).toBe('TAG 012');
  });
});

describe('folders', () => {
  const t = (key: string) => `t:${key}`;

  it('shows the translated default name until a folder is renamed', () => {
    expect(folderName(t, { kind: 'police', name: null })).toBe('t:backpack.folderKinds.police');
    expect(folderName(t, { kind: 'police', name: 'AFP check' })).toBe('AFP check');
    expect(folderName(t, { kind: null, name: 'Rental' })).toBe('Rental');
  });

  it('puts default folders first, then your own oldest first', () => {
    const f = (
      id: string,
      kind: 'identity' | 'other' | null,
      position: number,
      created_at: string,
    ) => ({
      id,
      kind,
      name: null,
      position,
      created_at,
    });
    const sorted = sortFolders([
      f('mine-new', null, 0, '2026-11-26T02:00:00Z'),
      f('other', 'other', 5, '2026-11-01T00:00:00Z'),
      f('mine-old', null, 0, '2026-11-26T01:00:00Z'),
      f('identity', 'identity', 0, '2026-11-01T00:00:00Z'),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['identity', 'other', 'mine-old', 'mine-new']);
  });
});
