import { z } from 'zod';

/**
 * Public app config. Only EXPO_PUBLIC_* values are bundled into the app, so never put
 * secrets here (the Supabase service-role key belongs to Edge Functions only).
 * Expo inlines these at build time, so each one must be read as a literal property.
 */
const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof schema>;

export function readEnv(): Env {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(
      `Missing or invalid env: ${missing}. Copy .env.example to .env and fill it in (see README).`,
    );
  }
  return parsed.data;
}
