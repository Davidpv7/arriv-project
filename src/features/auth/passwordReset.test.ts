import { forgotPasswordSchema, newPasswordSchema } from './schemas';

const issues = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (r.success ? [] : (r.error?.issues ?? []).map((i) => `${String(i.path[0])}:${i.message}`));

describe('forgotPasswordSchema', () => {
  it('needs a real email', () => {
    expect(issues(forgotPasswordSchema.safeParse({ email: 'ana@arriv.test' }))).toEqual([]);
    expect(issues(forgotPasswordSchema.safeParse({ email: 'ana' }))).toEqual([
      'email:auth.errors.email',
    ]);
  });
});

describe('newPasswordSchema', () => {
  it('accepts a long enough password typed twice', () => {
    expect(
      issues(newPasswordSchema.safeParse({ password: 'new-pass-123', confirm: 'new-pass-123' })),
    ).toEqual([]);
  });

  it('needs at least 8 characters', () => {
    expect(issues(newPasswordSchema.safeParse({ password: 'short', confirm: 'short' }))).toEqual([
      'password:auth.errors.passwordShort',
    ]);
  });

  it('needs both entries to match', () => {
    expect(
      issues(newPasswordSchema.safeParse({ password: 'new-pass-123', confirm: 'new-pass-124' })),
    ).toEqual(['confirm:auth.errors.passwordMismatch']);
  });
});
