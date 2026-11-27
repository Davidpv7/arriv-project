import { z } from 'zod';

// Error strings are i18n keys; screens translate them.
export const signInSchema = z.object({
  email: z.email('auth.errors.email'),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'auth.errors.nameRequired')
    .max(50, 'auth.errors.nameTooLong'),
  email: z.email('auth.errors.email'),
  password: z.string().min(8, 'auth.errors.passwordShort'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('auth.errors.email'),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'auth.errors.passwordShort'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'auth.errors.passwordMismatch',
  });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
