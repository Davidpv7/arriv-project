# Arriv

Mobile-first social network for people living in Australia on a visa. One Expo codebase for iOS, Android and web, on Supabase.

- Product context: [docs/arriv-context.md](docs/arriv-context.md)
- Build spec and phases: [docs/arriv-mvp-spec.md](docs/arriv-mvp-spec.md)
- Working rules: [CLAUDE.md](CLAUDE.md)

## Setup

Requirements: Node 22, and Docker Desktop (for local Supabase). For native: Xcode (iOS Simulator) and/or Android Studio, or the Expo Go app on a phone.

```bash
npm install
cp .env.example .env
npm run db:start      # local Supabase in Docker; prints the API URL and publishable/anon key
# put those two values in .env
npx expo start        # then press i (iOS), a (Android) or w (web)
```

### Demo accounts (local only)

`npm run db:reset` loads [supabase/seed.sql](supabase/seed.sql). Password for all: `arriv-demo-1`.

| Email              | State                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `ana@arriv.test`   | Onboarded, Brazil → Sydney, visa 500 (connections only), connected to Mateo |
| `mateo@arriv.test` | Onboarded, Colombia → Melbourne, visa 485 (public)                          |
| `lina@arriv.test`  | Not onboarded yet: opens onboarding                                         |

The seed also adds six crews (Sydney Newcomers, Latinos en Sydney, Student Visa 500 Crew, Melbourne Movers, Brasileiros na Austrália, Sponsored Workers 482) with a few postcards, comments and likes. Ana owns Sydney Newcomers, so she can remove posts there.

### Testing on a phone

Keep `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`. In development the app swaps `127.0.0.1` for your computer's address on the network (the one Expo serves from), so Expo Go reaches your local Supabase. Phone and computer must be on the same Wi-Fi.

Adding photos opens the system photo picker. On iOS 14+ and Android 13+ it needs no permission prompt: the app only receives the photos the person picks.

The design-system screen is still at `/ds`.

## Scripts

| Script                                      | What it does                                         |
| ------------------------------------------- | ---------------------------------------------------- |
| `npm start`                                 | Expo dev server                                      |
| `npm run lint` / `lint:fix`                 | ESLint (Expo config + Prettier + Arriv screen rules) |
| `npm run format` / `format:check`           | Prettier                                             |
| `npm run typecheck`                         | `tsc --noEmit` (strict)                              |
| `npm test`                                  | Jest + React Native Testing Library                  |
| `npm run export:web`                        | Production web build into `dist/`                    |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase                                       |
| `npm run db:types`                          | Regenerate `src/types/database.ts` after a migration |
| `npx supabase test db`                      | pgTAP tests in `supabase/tests` (RLS)                |

## Hosted Supabase (Sydney)

1. Create a project at supabase.com in region **Sydney (ap-southeast-2)**.
2. `npx supabase login` then `npx supabase link --project-ref <ref>`.
3. Put the project URL and publishable key in `.env` (or EAS env vars for builds).
4. Push migrations with `npx supabase db push`.

The service-role key never goes in `.env` or the app.

## Layout

```
app/                 Expo Router screens (ds.tsx = design-system showcase)
src/theme/tokens.ts  Design tokens (tested against docs/design/tokens.json)
src/components/ds/   Design-system components: build screens only from these
src/i18n/en.json     All user-facing text
src/lib/             Supabase client, secure session storage, env, query client
supabase/            config.toml, migrations, seed.sql, tests (pgTAP), functions
```

## Guardrails in lint and tests

- Screens in `app/` can't contain hex colours or import Supabase directly (ESLint errors).
- `tokens.ts` must match `docs/design/tokens.json`; documented text/fill pairs must meet 4.5:1 contrast.
- `supabase/tests/000_rls_enabled.test.sql` fails if any `public` table lacks RLS.
- CI (`.github/workflows/ci.yml`) runs format, lint, typecheck, tests, a web export, and the database tests.
