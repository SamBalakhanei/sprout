# Study guide

Sprout is prepared for an exploratory user study; the repository does not contain study results or evidence that a study has been run. Pilot the protocol and measure actual completion time before scheduling participants. A small sample can reveal usability issues and generate hypotheses, but cannot establish effectiveness or support reliable population-level comparisons.

## What participants do

1. The baseline asks 10 progressively harder scenario questions: two each on ownership, risk, diversification, funds, and time, including concrete calculations. Each offers “I don’t know yet.” Participants separately rate confidence in ownership and diversification from 1 to 5. Back allows editing; the baseline does not show correctness feedback.
2. Participants complete ownership (Lesson 1) before diversification (Lesson 2) unlocks. Each lesson has three comprehension checks, an interactive scenario and reasoning choice, a transfer question, two fresh post-lesson questions, and a confidence rating. Lesson questions do not offer “I don’t know yet.” Every lesson question gives feedback immediately after the first submission, including each post question. Back allows review while preserving first submitted answers; confidence remains editable. Saved lesson drafts resume after exit or reload.
3. The ownership scenario shows a fixed illustrative $225 purchase followed by $210. Gain/loss assignment is disabled for this flow; historical server-assigned variants remain stored but are unused. The diversification scenario asks about allocation and concentration.
4. Each completed lesson has one guided virtual purchase. Lesson 1 offers a button to continue to the next lesson; Lesson 2 requires a company in a sector outside all current holdings. Pressing Buy records the reasoning attempt and shows feedback; a correct reason is required to purchase. Home offers a read-only portfolio, with no free trading or selling. Purchases use quotes and virtual money, distinct from the fixed lesson scenario; quote source and timestamp remain visible.

Same-sector stocks remain selectable in Lesson 2. The app evaluates that choice when Buy is pressed, gives corrective feedback, and leaves the order unfilled. Attempt events record `symbol` and `sectorCorrect` separately from reasoning correctness. Back controls are left-side arrows; Exit continues to leave the lesson.

## Comparing learning

The app's two-question baseline and post-lesson scores are matched by concept, not identical wording. In `progress.ts`, ownership uses baseline IDs `own1` and `risk1`; diversification uses `div1` and `div2`. Compare each lesson's two baseline answers to its own two post-lesson answers, and report confidence separately. Each post answer is recorded before its immediate feedback; feedback may influence responses to later post questions. These very short measures are exploratory and do not by themselves establish learning or retention. Checks, scenario reasoning, and transfer responses provide additional observations, not substitutes for a validated instrument.

New assessments and lesson results carry `contentVersion: sprint4.v4`; event payloads use `appVersion: sprint4.v4`. Analyze v2 and v3 records separately from v4. Onboarding revision events preserve the initial response in the event history; the final baseline uses the latest answers. Revisited lesson responses do not emit duplicate submissions.

The fixed v4 outcome does not support a new gain/loss comparison. Record sample sizes and missing data, and avoid treating an observed difference as causal evidence from a small pilot without an appropriate study design and analysis.

## Data and export

Question events contain `questionId`, `selected`, `correct`, `responseMs`, and `phase`; lesson events also include `lessonId` and whether the lesson is a review. Events have an ID, type, timestamp, and payload. Session progress contains the baseline answers and confidence, lesson results (first check answers, reasoning, transfer, post answers, confidence, and completion date), and the assigned variant. Screen events record navigation and elapsed time; guided trade intent records the order, reason, allocation, cash and holdings before the order. Completed trades are recorded separately. Timing is client-side and should be treated as approximate.

On the home screen, **Export this device’s study data (CSV)** exports the authenticated user's sessions, events, and trades available from Supabase. The CSV combines records with a `table` column; nested values are JSON text. On web it downloads a file; on supported mobile devices it opens the share sheet. Events are queued locally before upload, so ensure the device is connected and syncing succeeds before exporting. This export is scoped to that anonymous account, not all participants.

For a team-wide dataset, an authorized project administrator must export the relevant `study_sessions`, `study_events`, and trade records from the project's Supabase database using appropriate administrative access. The in-app export and row-level security do not provide a team-wide view. Handle exported study data according to the study's consent and privacy procedures.

## Outside the current scope

Questions about whether reminders or gamification increase return visits require a longitudinal design and additional instrumentation. Reminder delivery and an experiment measuring return beyond a single session are not implemented; do not infer those outcomes from this build.
