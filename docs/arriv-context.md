# Arriv — Project Context

**Owner:** David
**Status:** MVP planned, ready to build (Phase 0)
**Last updated:** 23 November 2026

> This is the source of truth for Arriv. Arriv is a **new, standalone project**. It is not connected to Venturo, earlier Arriv prototypes (Express/Prisma/Supabase or Firebase), or any learning curriculum. Ignore those.
>
> The build plan (MVP scope, data model, access rules, app structure, phases) is in **`arriv-mvp-spec.md`**.

---

## 1. What Arriv is

Arriv is a **mobile-first social network for people living in Australia on a visa**. It helps them meet other migrants, ask questions, share experiences, form communities, and keep their immigration documents in one place.

**Arriv connects people. It does not give immigration advice.** Users share personal experience with each other. Registered migration agents and lawyers are on the platform so users can find and contact them (after v1).

- **Initial market:** Australia
- **Audience:** anyone in Australia holding a visa (students, workers, partners, visitors, skilled migrants, people working towards PR)
- **Language:** English at launch; translation into other languages later
- **Goal:** a real business that also serves as David's portfolio
- **Timeline:** none set yet

## 2. Core idea

**Community is the core.** People open Arriv to connect with others in the same situation, ask questions, and chat. The other features support that:

| Area | Purpose |
|---|---|
| Home feed | Posts and "Journey Updates" from people and communities |
| Communities | Groups by city, visa type, culture or interest; anyone can create one |
| Chat | Direct messages and group chats |
| My Backpack | Personal document drive |
| My Journey | Timeline of the user's migration milestones |
| Visas | ~~Simplified visa info~~ removed from v1 (26 Nov 2026); maybe later |
| Visa stats | Waiting times reported by members who opt in, per visa subclass, with journey updates to comment on. Labelled not official; only groups of 5 or more (28 Nov 2026) |
| Migration Lawyers | Directory of verified agents and lawyers, with reviews (after v1) |
| Profile | Identity, visa status, posts, connections, communities |

## 3. Design direction — "Travel & passport" (chosen)

**Decision (22 Nov 2026):** Arriv uses the **travel & passport** direction. It's original and stands out from typical social media. David accepts it will be harder to build.

- **Sketch canvas:** "Arriv — Mobile Sketch" (Option B rows). Option A (playful flat orange) is kept for reference only.
- **Design system:** "Arriv" design system artifact. It holds tokens (colours, type, spacing, radii, tilt), the brand book (README) and component guidelines with previews. **It is the source of truth for visual details. Build from it.**

### Concept
The whole app uses the language of travel. The user's migration journey is a trip, and the UI is made of travel objects:

| Screen | Metaphor |
|---|---|
| Welcome / sign-up | Navy "AU Arrivals" screen with a blank **boarding pass** ("???" → AUS); CTA "Get my boarding pass" |
| Home greeting | **Boarding pass** (origin → SYD, visa, day count, stamps), with perforated edge and notches |
| Feed posts | **Postcards** with an airmail-stripe top edge, a community "stamp" in the corner, and postmarks for milestones (e.g. "PR GRANTED") |
| Communities | **Departures board**: crew name, "gate" (city or AU), status (Joined / Board) |
| Chat | Header as a **gate sign** ("Gate AU · 214 on board"); "Customs notice" for the not-advice disclaimer; files as small luggage tags; paper-plane send |
| My Backpack | Folders are **luggage tags**; recent files are a **baggage receipt** list. Header: "Checked in · Private" |
| My Journey | **Passport page** where milestones are stamps (arrival, visa granted, first job), plus a dashed "Next stamp?" placeholder |
| Visa guide | Each visa is a **ticket**: subclass on the stub; processing, fee and stay in mono; "Official page" + "Ask the crew" |
| Lawyers ("Trusted guides") | **ID badges** with a round "Verified" postmark, registration number, client reviews, specialties, Message button (after v1) |
| Profile | **Passport cover** (navy, photo, name, BRA → AUS, since date), visa-visibility control, stats stub, tabs Postcards / Stamps / Crews |
| Shortcuts | Perforated **postage stamps** (Journey, Passport; Lawyers later) |

All main screens are sketched and linked as a clickable prototype.

### Colour
| Name | Hex | Use |
|---|---|---|
| Passport Navy | #1F2A44 | Main text, tab bar, passport cover, departures board |
| Paper | #F7F0E1 | App background |
| Card Paper | #FFFDF7 | Cards, postcards, passport pages |
| Tangerine | #FF7A2F | Primary action, active tab, key stamps |
| Sunshine | #FFD15C | ＋ button, highlights, departures board text |
| Sky | #A9D4FF | Info, visa-related |
| Stamp Teal | #1F6B66 | Stamps, "verified" / positive states |
| Rust | #B8480C | Orange text, small labels, alerts |
| Airmail Red / Blue | #D64545 / #2E5AA8 | Decorative airmail stripes only |

Rule: navy text on coloured fills. Never white text on orange.

### Type
- **Nunito** (rounded): headings 900, body 600, meta 700. Friendly and readable for people using English as a second language.
- **DM Mono**: small uppercase travel labels (BOARDING PASS, GATE, TAG 001, dates on stamps).

### Shape and details
- Stamps and stickers are slightly rotated (tilt tokens: 2°, 6°, 12° for postmarks); cards, lists, inputs and text stay straight.
- Dotted borders for postage stamps, dashed lines for perforations, double borders for round postmarks.
- Navy bottom tab bar: Home, Communities, centre ＋ (yellow, perforated), Chat, Backpack. Active tab is an orange pill.
- Touch targets at least 44px.

### Components (in the design system)
Button, Stamp, Postmark, BoardingPass, Postcard, DepartureRow, LuggageTag, TabBar.

### Build notes
- Build these components once and reuse them everywhere, so the theme stays consistent and is easier to build.
- Keep the travel style for character, but make sure core tasks (posting, chatting, finding a document) stay fast and clear.
- Some elements may need SVG or custom shapes on mobile (clipped tag shapes, perforation notches, rotated stamps).
- Visa fees and processing times in the sketches are placeholders. Real values must come from Home Affairs.

## 4. Features

The original web mockups were a **guide only**. Mobile is the priority. v1 scope is defined in `arriv-mvp-spec.md`.

### Home feed
- Composer with modes: **Post**, **Question** and **Journey update**
- Posts can include images; likes, comments, share
- Posts show author name, time, and visa type (subject to privacy settings)
- Journey updates are highlighted in the feed

### Communities
- Browse, search, join, and **create** communities
- Each community has a name, description, member count, location (city or Australia-wide) and topic tags
- Filters: near me, visa type, language, culture

### Chat
- 1:1 messages, group chats and a chat room per community
- Attachments, images; sharing from Backpack sends a copy after confirmation
- Pinned "shared experience, not advice" notice in group chats

### My Backpack (own tab)
- A **personal drive** for immigration documents, such as passports, police checks, visa grant letters, and (later) documents from a lawyer or agent
- Folders/categories, upload, view, download
- Journey events can link to Backpack files
- **Owner-only in v1.** Lawyers/agents sharing documents with clients comes later
- **Highly sensitive data.** Strong security: private storage, strict access rules, short-lived links

### My Journey
- Milestones (visa granted, arrival, education, work, PR) shown as passport stamps
- Each milestone can have notes and attached documents
- Upcoming items and reminders (for example, visa expiry)
- Milestones can be shared to the feed as Journey Updates (the stamp only, never the documents)

### Visas (removed from v1, 26 Nov 2026)
- Browse by category: Work, Study, Family, Visitor, Humanitarian
- Each visa shows subclass, short description, processing time, fee, duration and key eligibility points
- Always labelled as **simplified information** with a link to the official Department of Home Affairs page

### Migration Lawyers directory (after v1)
- Search and filter by name, firm, location and specialty
- Profiles show firm, location, rating, bio, specialty tags, contact details and website
- **Verified** badge, checked against the official public register of migration agents (and the relevant registers for lawyers)
- **Reviews are written by users who are their clients** on the platform

### Profile
- Name, handle, photo, bio, origin, location, join date, links
- Visa status with **privacy controls** so the user chooses whether it's public, visible only to connections, or hidden
- Counts for posts, connections and communities
- The user's posts and journey summary

## 5. User types

| Type | Description |
|---|---|
| Free member | Visa holder with limited access (everyone is free in v1) |
| Paid member | Visa holder with full access (after v1) |
| Lawyer / agent | Professional account. Pays to be on the platform, can be found by users, has a profile and reviews, can message and upload documents for clients (after v1) |
| Admin / moderator | Verification, moderation, reports |

## 6. Business model (draft)

- **v1 is free for everyone** to grow the community. The tier field exists so subscriptions can be switched on later.
- **Free tier (later):** limited posting and commenting; can't see the lawyers directory, and some other features are locked
- **Paid tier (later):** low-cost subscription that unlocks everything
- **Professional tier (later):** lawyers and agents pay to have a presence on the platform

Open points:
- Free users can't see lawyers, but lawyers pay to be found, so their audience shrinks. Consider letting free users browse lawyers and keeping contact/messaging for paid members.
- Exact limits and prices for each tier

## 7. Trust, safety and legal

- **No advice:** Arriv is a social platform. It does not provide immigration advice or assistance.
- **Standing disclaimer:** community content is personal experience, not professional advice. Point users to registered agents and lawyers.
- **Clear labels** that separate official information (Home Affairs), community experiences and professional services
- **Moderation:** reporting posts, comments, messages, users and communities; blocking users
- **Privacy:** visa status is optional to display. Documents are private by default. Account deletion in the app.
- **Verification (later):** agents checked against the official register before getting a Verified badge
- **Reviews (later):** only from real clients, and how to confirm that is still to be decided
- Before launch, check the rules on immigration assistance, privacy law, and Home Affairs website terms of use

## 8. Tech stack (chosen, 23 Nov 2026)

**Decision:** one universal Expo app for iOS, Android and web, on a Supabase backend. Chosen because it's one language (TypeScript/React) and one codebase. It's also the most common setup for this kind of app, and Supabase's database access rules suit private immigration documents.

| Layer | Choice | Role in Arriv |
|---|---|---|
| App framework | **Expo (React Native) + Expo Router**, TypeScript | One codebase for iOS, Android and web; file-based navigation |
| Builds and updates | **EAS Build / EAS Update** | Cloud builds for the app stores; over-the-air updates |
| Backend | **Supabase** (Sydney region) | Postgres database, auth, storage, real-time, edge functions |
| Database | Supabase **Postgres** with **Row Level Security** | Users, profiles, communities, memberships, posts, journeys, (later) lawyers, reviews, tiers |
| Auth | **Supabase Auth** | v1: email + password, Google, Apple |
| Documents (Backpack) | **Supabase Storage**, private buckets + RLS | Only the owner can read files in v1 |
| Chat | **Supabase Realtime** to start | 1:1, group and community chat. Move to a dedicated chat service (e.g. Stream, Sendbird) only if needed later |
| Payments | **RevenueCat** (after v1) | Member subscriptions in the app. Lawyer tier possibly billed on the web via Stripe; check app store rules |
| Push notifications | **Expo Notifications** | Messages, replies, visa-expiry reminders |
| Travel-theme visuals | **react-native-svg** + design-system tokens | Stamps, tags, perforations, postmarks |
| App data & forms | TanStack Query, Zustand, react-hook-form + zod, i18next | |

Web hosting: Vercel (decided 26 Nov 2026). Not yet decided: analytics, error monitoring, search (Postgres full-text to start).

## 9. Official information (Home Affairs)

- The goal is to use the Department of Home Affairs website for visa details, processing times and news, so ~100+ visas aren't maintained by hand
- No official API is known. v1: visa entries added by an admin, each linking to the official page, with a "last checked" date
- Automating updates is still open, to be researched after v1
- **Decided 26 Nov 2026:** no visa guide in v1. Home Affairs updates its pages often and can't be read automatically, so hand-entered visa details would go stale. Revisit only with a reliable official source.

## 10. Decisions made

- [x] Name: Arriv
- [x] Market: Australia; audience is anyone on a visa
- [x] Core: community (feed, communities, chat)
- [x] My Backpack is its own tab and works like a drive
- [x] Lawyers/agents have accounts, are verified against the register, and are reviewed by their clients (after v1)
- [x] Visa status visibility is controlled by the user
- [x] Standing "not advice" disclaimer
- [x] Freemium plus a paid professional tier (after v1)
- [x] Native mobile first, with a web app alongside
- [x] English first, other languages later
- [x] **Design direction: travel & passport** (boarding pass, postcards, departures board, luggage tags, passport stamps)
- [x] Colours: Passport Navy, Paper, Tangerine, Sunshine, Sky, Stamp Teal. Fonts: Nunito + DM Mono
- [x] Navigation: bottom tab bar with centre ＋ (Home, Communities, ＋, Chat, Backpack)
- [x] All main screens sketched; first version of the Arriv design system created
- [x] **Stack: Expo + Expo Router + Supabase + RevenueCat** (one codebase for iOS, Android and web)
- [x] **MVP (v1):** sign-up/onboarding, profile, communities, feed, chat, Backpack, Journey, safety, notifications (visa guide removed 26 Nov 2026)
- [x] **Lawyers and agents come after v1**
- [x] **Free at launch**; tiers switched on later
- [x] **Sign-in v1:** email + password, Google, Apple
- [x] **Anyone can create a community** in v1 (25 Nov 2026); reporting is the safety net
- [x] **One chat room per community** in v1 (26 Nov 2026); topic threads maybe later
- [x] **Tab bar stays on every screen** (26 Nov 2026), except full-screen tasks (composer, start-a-crew wizard, onboarding). Each tab keeps its own history; tapping the active tab goes back to its top. No separate Home button. Done 26 Nov 2026 (per-tab stacks in `app/(tabs)/(home,communities,chat,backpack)/`).

## 11. Still open

- Lawyer features and permissions (document sharing, messaging, client relationship)
- How to confirm a reviewer was actually a client
- Free vs paid limits and pricing for all tiers
- Home Affairs automation after v1
- Moderation tools, policy and first moderators
- Secondary screens: notifications, settings, composer, community detail, onboarding steps
- Analytics, error monitoring (web hosting decided 26 Nov 2026: Vercel; app icon decided: the stamp)

## 12. Next steps

1. Create the repo with `CLAUDE.md`, `docs/arriv-context.md` and `docs/arriv-mvp-spec.md`
2. Phase 0 with Claude Code: Expo app, Supabase project (Sydney), tokens, fonts, design-system components
3. Then follow the phases in the MVP spec
