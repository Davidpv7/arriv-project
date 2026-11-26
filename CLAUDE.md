# Arriv

Mobile-first social network for people living in Australia on a visa: communities, chat, a private document "Backpack", a milestone "Journey" and a simplified visa guide. Arriv connects people; it never gives immigration advice.

## Read first
- `docs/arriv-context.md`: product context and decisions
- `docs/arriv-mvp-spec.md`: v1 scope, data model, RLS, storage, app structure and build phases. **Follow its phase order.**
- Design: travel & passport style. Tokens live in `src/theme/tokens.ts`. Build screens only from `src/components/ds/`.

## Stack
Expo (React Native) + Expo Router, TypeScript strict · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · TanStack Query · Zustand (UI state only) · react-hook-form + zod · react-native-svg · i18next · Expo Notifications. One codebase for iOS, Android and web.

## Commands
- `npx expo start`: run the app (press i / a / w)
- `npx supabase start`: local Supabase
- `npx supabase migration new <name>`: new migration
- `npx supabase db reset`: rebuild local DB from migrations + seed
- `npx supabase gen types typescript --local > src/types/database.ts`: regenerate types after every migration
- `npm run lint`, `npm run typecheck`, `npm test`

## Rules
- **Security lives in the database.** Every new table gets RLS enabled and policies in the same migration, plus a test that a non-owner is denied.
- **Backpack files are owner-only.** Never add a policy that lets another user read `documents` or the `backpack` bucket (lawyer sharing comes later via `document_shares`).
- Never change an applied migration; add a new one.
- Never put the Supabase service-role key in the app. It's only for Edge Functions.
- Use generated types from `src/types/database.ts`; no `any`.
- Data access goes in `src/features/<area>/api.ts` as TanStack Query hooks; screens don't call Supabase directly.
- All user-facing text goes through i18n (`src/i18n/en.json`).
- Colours, spacing, radii and fonts come from tokens. No hard-coded hex values in screens.
- Text on coloured fills is navy, never white. Touch targets ≥ 44px. Rotate stamps/tags only, never text blocks or inputs.
- Visa fees and processing times must link to Home Affairs. Don't invent figures.
- Test on iOS, Android and web (including mobile-width web) before calling a phase done.

## Current phase
Phase 6: Visa guide (update this line as phases finish). Phase 0 and Phase 1 done 25 Nov 2026. Phase 2, 3, 4 and 5 done 26 Nov 2026 (Phase 5 real-phone push check deferred to Phase 8).
