# Supabase setup

1. Create a Supabase project, enable anonymous sign-ins under Authentication > Sign In / Providers, and run the SQL files in `migrations/` in numbered order, once each. Existing projects should apply any remaining migrations through `003_lesson_trades.sql`.
2. Create and deploy an Edge Function named `market-quotes` using `functions/market-quotes/index.ts`; keep JWT verification enabled. The function uses Supabase's automatically provided service-role secret to write quote cache entries. Never put that secret in the app.
3. Copy `.env.example` to `.env` and add the project URL and publishable/anon key. Restart Expo after changing environment variables.

The anonymous user identity persists in app storage; clearing it or reinstalling can make that account inaccessible. A reset creates a new session with a new $1,000 practice account and preserves previous sessions, events, and trades. The server assigns gain/loss randomly. Each ownership and diversification lesson awards $1,000 once per session after a complete lesson result, including first-attempt answers; the reward is independent of trading returns. Diversification requires an ownership reward in the same session, enforced by a database trigger as well as the app.

The quote function retrieves Yahoo Finance chart data with a Nasdaq fallback. Both may be delayed; provider availability, terms, and licensing must be reviewed before production use. No paid API key is required, but these endpoints can stop working or block requests. The app must show the quote time and source. Trades use the server's cached quote (not a user-submitted price), require a cache fetched within 24 hours and a market timestamp within seven days, and may fail when quotes are unavailable. These are practice trades, not brokerage orders.

RLS restricts data to its anonymous authenticated user. Account balances, holdings, trades, lesson rewards, and quotes cannot be edited directly by app users. The order UUID makes trade retries safe. Study event IDs are also unique, allowing duplicate inserts to be ignored. Export contains the user's raw sessions, events, and trades.

Run `tests.sql` in the SQL editor after migration to check isolation, validation, and retry behavior. It rolls back all test data.

Migration 003 limits each lesson to one recorded purchase through `place_lesson_trade`; direct client access to `place_trade` is revoked. The RPC requires a completed lesson and correct reasoning. Diversification additionally requires the ownership purchase and a sector absent from every current holding. The lesson key and user transaction lock prevent extra fills, including retries using a new order ID. Existing uploaded guided-trade events link historical fills; sessions with unmatched legacy trades cannot make a new checkpoint purchase and must start a new session. Their earlier records remain intact.

## Research export and verification

To export study data, open `export.sql` and run each of its three SELECT statements separately in the project's SQL editor. Download each result as CSV. Join sessions, events, and trades using `session_id`; the export omits authentication user IDs and excludes every session containing an event whose type is `integration_test`. A test session without that marker is not automatically excluded. The event payload and progress are included as recorded and should be handled according to the study's privacy requirements.

To repeat the database checks, run the entire `tests.sql` script in the SQL editor as project owner after applying the migrations. It creates temporary test users and quote fixtures inside a transaction, checks isolation, lesson validation and reward retries, reasoning, sector restrictions, once-only purchases, and insufficient funds, then rolls the transaction back. An SQL error means a check did not pass. The opt-in `scripts/check-backend.ts` separately exercises anonymous sign-in, five real quotes, the guided purchase guards, and user isolation in explicitly excluded test sessions.
