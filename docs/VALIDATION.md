# Validation record

These are implementation checks, not participant-study findings.

## Onboarding confidence-order revision

- Both arms completed in an isolated browser fixture using the actual Assessment component. Animation and native crypto dependencies were substituted; no Supabase writes occurred. A showed confidence first; B showed ten questions before confidence. Both completion callbacks contained ten answers and both confidence ratings.
- A selection/revision walkthrough recorded 10 first-submission unknown answers, 9 final unknown answers, and 11 raw unknown selections. This verified that Back revisions preserve the original answer and that unsubmitted changes remain distinct from submitted answers.
- TypeScript, 18 tests, and the Expo web export passed. This fixture does not verify physical-device behavior or a new hosted event upload; it uses the existing event queue/upload path. No database migration is required.

## Existing checks

- Expo TypeScript validation and 18 unit/content tests cover baseline breadth and difficulty order, exposure and fee arithmetic, answer integrity, explanations, the fixed ownership loss, both onboarding confidence-order schedules, unique unknown-answer scoring, sector eligibility, saved drafts, server-completion recovery, first attempts, lesson checkpoints, matched score separation, calendar streaks, and CSV escaping.
- The hosted Supabase migration was applied through its browser SQL editor. The rollback-only SQL checks completed without errors, including once-only rewards, malformed result rejection, duplicate orders, insufficient balance, and user isolation.
- The opt-in hosted integration check successfully created an anonymous session, stored an event, retrieved real quotes for AAPL/MSFT/KO/JPM/WMT, bought and sold a virtual share, retried an order without duplicating it, rejected insufficient funds, and verified a second anonymous account could not read the first account's session.
- Yahoo quote requests were blocked from one development egress but succeeded from the deployed Edge Function. Nasdaq fallback returned valid prices/timestamps during a separate development check. Source timestamps and possible delay are shown in the app.
- Browser walkthroughs use synthetic test answers and virtual orders. They must not be included as participant evidence. The research export SQL excludes explicitly marked `integration_test` sessions.
- The complete browser walkthrough verified both lesson flows, a preserved incorrect first attempt, the loss scenario, two once-only lesson rewards, a diversification purchase with reduced company concentration, a sale, reload/resume, Level 2, and the CSV download. Its session was explicitly marked `integration_test` in the hosted database.
- The client bundled successfully for iOS, Android, and web. The Deno Edge Function passed its separate type check. Phone-width screenshots are in `docs/screenshots`; they show synthetic walkthrough data.

Physical-phone interactions, haptic feel, network-loss recovery under realistic conditions, and the participant study remain human verification tasks. Do not describe a successful bundle as a completed physical-device test.

## Question and navigation revision · November 11

- Applied migration `002_lesson_prerequisite.sql` to the hosted project. Extended rollback SQL checks passed, including rejecting Lesson 2 before Lesson 1 and awarding it once after the prerequisite.
- A fresh browser walkthrough verified editable onboarding Back with retained selections and no correctness feedback, lesson Back with preserved incorrect-answer feedback, Lesson 2 disabled before Lesson 1 and enabled after completion, and a successful completion after revisiting questions.
- Hosted records confirmed the revised onboarding answer, one revision event, one submission for the revisited lesson check, the original incorrect first answer, and `sprint4.v2` content metadata. The synthetic session `29730f4b-064c-44ed-8ade-f6377cf052c8` is marked `integration_test` and excluded by the research export.
- `docs/screenshots/lesson-lock.png` and `quiz-back-review.png` show these browser checks. Earlier screenshots predate this revision.

## Lesson and trade revision · November 12

- Browser walkthroughs verified Exit and reload restoring the selected answer and its feedback, Home resuming an unfinished Lesson 2, feedback for every question in both lessons, and neutral confidence ratings.
- General Practice was disabled with one completed lesson and enabled after both. The Lesson 1 guided checkpoint remained available and its receipt opened Lesson 2 directly.
- Wrong guided reasoning in both checkpoints showed a red X and disabled the order button. Correcting it enabled submission. Both virtual orders succeeded; the diversification purchase reduced company concentration.
- The receipt feedback remained visible with transaction history below it; scrolling targets the feedback view, once per receipt, rather than the end of the page. Provider labels displayed source and timestamp without the removed delay annotation.
- TypeScript, all 15 tests, Prettier, and iOS/Android/web exports passed. No physical-phone haptic verification is claimed. All walkthrough activity used the already excluded synthetic session `29730f4b-064c-44ed-8ade-f6377cf052c8`.
- Current screenshots: `lesson-vocabulary.png`, `guided-trade-result.png`, and `trade-feedback-focus.png`.

## Single-purchase checkpoints and portfolio · v4

- Applied migration 003 to the hosted project. Rollback SQL checks passed for wrong reasoning, same-sector rejection, once-only lesson rewards, one purchase per lesson even with a new order ID, sufficient funds, revoked unrestricted trading, and user isolation.
- The isolated hosted integration script passed using five genuine provider quotes, two lesson purchases in different sectors, rejected wrong reasons, rejected an unaffordable order, and rejected a same-sector purchase. Its anonymous session is explicitly marked `integration_test`.
- A fresh browser walkthrough used excluded session `ca2c569e-514a-4104-a078-57fd11d3ff31`. It confirmed unnumbered share controls, the fixed $225 → $210 outcome, unsure choices only during onboarding, neutral trade selections until Buy, wrong-reason feedback without a fill, grey disabled Sell controls, and company logos to the left of names.
- After buying Apple in Lesson 1, Lesson 2 disabled Apple and Microsoft, displayed their Technology sector, and defaulted to eligible Coca-Cola. Both checkpoints reopened after reload as receipts without an order form. Each successful receipt linked to the read-only portfolio; Home contained no Practice entry.
- TypeScript, all 16 tests, formatting, and iOS/Android/web exports passed. Screenshots include `portfolio-v4.png`, `price-loss-v4.png`, and `reason-before-buy-v4.png`. Physical-device feel and participant-study outcomes remain untested by these implementation checks.

## Navigation and sector-feedback refinement

- Verified a same-sector Microsoft selection remained available while Apple was held. Buy displayed the red diversification explanation, preserved the balance and history, and did not fill an order. Changing to Coca-Cola allowed the purchase.
- Verified the shared left-side Back arrow returned to the prior lesson screen. Exit retained its text and separate behavior. Portfolio has one main heading, a left Back arrow, and shorter balance labels.
- The fresh walkthrough session `02d81803-c31d-4607-90d4-fbd2859b5915` is marked `integration_test`. Screenshots: `sector-feedback.png` and `portfolio-back-arrow.png`.
- TypeScript, all 16 tests, formatting, and three-platform exports passed; this refinement required no database migration.
