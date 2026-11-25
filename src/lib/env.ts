import { z } from 'zod';

/**
 * Public app config. Only EXPO_PUBLIC_* values are bundled into the app, so never put
 * secrets here (the Supabase service-role key belongs to Edge Functions only).
 * Expo inlines these at build time, so each one must be read as a literal property.
 */
const flag = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((v) => v === 'true');

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_KEY: z.string().min(1),
  /** Show "Continue with Google" once the provider is configured in Supabase. */
  EXPO_PUBLIC_AUTH_GOOGLE: flag,
  /** Show "Continue with Apple" once the provider is configured in Supabase. */
  EXPO_PUBLIC_AUTH_APPLE: flag,
});

export type Env = z.infer<typeof schema>;

export function readEnv(): Env {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    EXPO_PUBLIC_AUTH_GOOGLE: process.env.EXPO_PUBLIC_AUTH_GOOGLE,
    EXPO_PUBLIC_AUTH_APPLE: process.env.EXPO_PUBLIC_AUTH_APPLE,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Missing or invalid env: ${missing}. Copy .env.example to .env and fill it in (see README).`,
    );
  }
  return parsed.data;
}
