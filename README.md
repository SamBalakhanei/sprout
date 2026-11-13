# Sprout — Sprint 4

An Expo Go investing-literacy app: assess your starting point, learn ownership and diversification, then make guided virtual purchases using market quotes.

## Run

Use Node 22 LTS (`nvm use` reads `.nvmrc`) and Expo Go for SDK 58.

```sh
npm install
npm start
```

The local `.env` is configured for the Sprout Supabase project and is intentionally ignored by Git. On another computer, copy `.env.example` to `.env` and supply the project URL and publishable key. Never put a Supabase secret/service-role key in the mobile app. See [backend setup](supabase/README.md) for deployment on another project.

Scan Expo's QR code with a physical phone on the same network. For browser testing, use `npm run web`. No learner registration form or market-data API key is required.

## Implemented in Sprint 4

- Ten progressively harder baseline questions across five topics, including concrete calculations, plus separate ownership/diversification confidence ratings. Onboarding gives no correctness feedback; Back allows answers and confidence ratings to be edited.
- A home screen with two sequential lessons, XP, level, and a simple learning streak. Complete ownership (Lesson 1) to unlock diversification (Lesson 2).
- Interactive examples, three comprehension checks per lesson, a reasoning scenario, a transfer question, two post questions, and confidence measurement. Each lesson question gives feedback after its first submitted answer.
- An A/B ownership scenario: $225 → $240 or $210, using the session's saved 50/50 server assignment. Exposure and later trading events carry the variant; see [the study guide](docs/STUDY.md) for analysis.
- One guided whole-share purchase per lesson, virtual cash, holdings, valuations, order receipts, and a read-only portfolio from Home. There is no free trading or selling.
- Hosted anonymous sessions, first-attempt results, study events, raw CSV export, and local recovery of progress/events/pending orders.

A new study session starts with $1,000 virtual cash. Each completed lesson awards another $1,000 once and earns 120 learning XP. Completing both lessons reaches Level 2. Reviews do not award money again or overwrite the original completed result.

During a lesson, Back permits review while preserving first submitted answers; confidence remains editable. A saved lesson draft resumes after exit or reload. The “I don’t know yet” option is available in onboarding, but not lesson questions. Lesson 1 has a guided purchase checkpoint and a button to continue to the next lesson. Lesson 2 requires a company in a sector outside all current holdings. Reasoning attempts are recorded and feedback shown when Buy is pressed; a correct reason is required to purchase. New assessments and lesson results carry `contentVersion: sprint4.v5`; event payloads use `appVersion: sprint4.v5`. Analyze earlier versions separately from v5.

## Real versus illustrative

Practice fetches genuine provider quotes through a Supabase Edge Function. The app shows the source and price timestamp. Quotes may be the last available market price; there is no streaming-price promise. The service tries Yahoo Finance and a Nasdaq fallback, using their public, unofficial endpoints. Their availability and permitted use need review before a public production launch. A five-minute cache limits repeated requests. Missing data is reported, never replaced by invented prices.

The ownership lesson's loss is a controlled example. A lesson outcome is never inserted as a real market quote. Guided purchases are server-recorded simulations, not exchange executions. There are no real funds, fees, order books, short positions, or financial recommendations. Migration 003 and the lesson-trade RPC are deployed on the configured Sprout project; new environments must apply the migrations before running the app.

## Code organization

| Location              | Responsibility                                                                 |
| --------------------- | ------------------------------------------------------------------------------ |
| `App.tsx`             | Screen routing, navigation, reset, and export notifications                    |
| `screens/`            | Baseline, home, reusable lessons, guided purchases, read-only portfolio        |
| `content.ts`          | Curated question IDs, answer keys, lessons, recommendation, scenario constants |
| `domain.ts`           | Shared data contracts                                                          |
| `companies.ts`        | Company names, sectors, and bundled logo sources                               |
| `marketPolicy.ts`     | Pure eligibility checks for lesson purchases                                   |
| `progress.ts`         | Validation, matched pre/post summaries, local calendar streak                  |
| `hooks/useStudy.ts`   | Loading, session lifecycle, completion, and progress synchronization           |
| `storage.ts`          | Versioned local progress cache                                                 |
| `services/backend.ts` | Supabase authentication, sessions, lesson rewards, and events                  |
| `services/market.ts`  | Quote, portfolio, and trade adapters                                           |
| `services/events.ts`  | Durable, serialized event queue with idempotent upload                         |
| `services/export.ts`  | Study CSV generation and download/share                                        |
| `components/`         | Shared controls, illustrations, animation presets, swipe-dismiss notification  |
| `supabase/`           | Migration, Edge Function, rollback tests, team export queries                  |

See [architecture and review walkthrough](docs/ARCHITECTURE.md) and [study protocol](docs/STUDY.md).

Phone-width screenshots from the synthetic walkthrough: [Home](docs/screenshots/home.png), [Practice](docs/screenshots/practice.png). See the [validation record](docs/VALIDATION.md) for completed checks and remaining physical-device verification.

## Verify

```sh
npm run typecheck
npm test
npm run format:check
npx expo install --check
npx expo export --platform ios --platform android --platform web
```

For the Deno Edge Function:

```sh
deno check --no-config supabase/functions/market-quotes/index.ts
```

The opt-in integration check creates isolated anonymous test records, marks its session `integration_test`, and checks backend behavior:

```sh
node --env-file=.env --import tsx scripts/check-backend.ts
```

`supabase/tests.sql` runs transactional backend checks and rolls them back. `supabase/export.sql` exports team-wide research data using the administrator's SQL editor and excludes marked integration-test sessions. In-app exports contain only that anonymous account's records.

## Recovery and study limits

Completed milestones and saved lesson drafts resume after restart. An onboarding quiz interrupted midway starts again; submitted responses remain in the study event log. Screen changes save locally first and synchronize remotely. Event uploads retry in the foreground; lesson rewards, resets, and orders require the backend. Unconfirmed orders retain their request ID across restarts and retry without creating a second trade. Clearing app storage/reinstalling loses the anonymous identity; there is no cross-device account recovery yet.

The assessment and recommendation are exploratory, not validated placement or certification. Two matched baseline/post questions per concept are reported separately from confidence, reasoning, and transfer. Immediate feedback on each post question can influence answers to later post questions. No participant-study findings are claimed by the automated tests or implementation walkthroughs. Pilot the session length and independently verify touch behavior/haptics on physical phones.

## Planned for Sprint 5 — not implemented

- Separate researcher web dashboard connected to the shared backend.
- Team-wide visualizations, participant drill-down, and completion funnels.
- Dashboard A/B management and feature-flag controls.
- Longer independent-use and retention studies, distribution/reliability improvements.
- Additional curriculum/personalization justified by Sprint 4 findings.
- Monetization implementation if the chosen business model requires it.

Reminders, streaming quotes, advanced strategy analytics, and profit-based leaderboards are outside this Sprint 4 build.
