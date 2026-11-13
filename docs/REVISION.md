# Quiz and lesson revision

Work was split across three GPT 6.1 Terra agents. The lists below follow each agent's own order; the agents worked concurrently. All edits used direct file edits and patches, without Python.

## Curriculum agent

1. Reordered the ten onboarding questions into five increasing difficulty bands while retaining question IDs and answer positions.
2. Rewrote questions and distractors around concrete situations, ownership, exposure, volatility, overlapping funds, and fees.
3. Strengthened the arithmetic questions, checked their calculations, and added content assertions.
4. Revised lesson checks to apply cost basis, concentration, allocation, and percentage losses; added the necessary teaching context.
5. Formatted assigned files and ran TypeScript and unit tests.

## Quiz navigation and backend agent

1. Replaced one-step selection state with per-question selections in onboarding and lessons.
2. Added Back navigation, editable onboarding answers, and revision events.
3. Preserved submitted lesson answers and feedback on review, with no repeated submission events; kept confidence editable.
4. Removed redundant quiz instructions and ran TypeScript validation.
5. Added migration 002 to enforce the lesson prerequisite in the database and extended rollback tests for rejection, unlocking, and once-only rewards.

## Home and practice agent

1. Disabled Lesson 2 until Lesson 1 is complete and displayed its prerequisite.
2. Removed unnecessary home, practice, and illustration copy while retaining quote provenance, trade facts, errors, and virtual-money context.
3. Ran TypeScript validation.
4. Updated README and study instructions for the new flow, Back behavior, and revised question versions.

## Integration and review

The primary agent reviewed the content, requested the calculation refinements, shared the prerequisite helper across navigation and restoration, added regression coverage, and reset scroll position on quiz navigation. It then checked formatting, TypeScript, and all 12 tests; deployed the prerequisite migration; ran hosted rollback checks; and walked through onboarding revisions, lesson Back, and the Lesson 2 lock/unlock. Hosted data confirmed one submission for the revisited lesson question and preservation of the original wrong answer. Synthetic walkthrough records were excluded from the research export. See `VALIDATION.md` for verification details.

## November 12 follow-up

The same three Terra agents worked concurrently. Each list records that agent's order.

**Curriculum agent**

1. Split lesson intros into concise vocabulary definitions and added explanations for transfer/post questions.
2. Promoted the share-tapping instruction and added visible numbered controls.
3. Added explanation coverage assertions and ran tests.
4. Updated README and study guidance for v3 feedback, drafts, practice access, and first reasoning attempts.

**Lesson flow and review agent**

1. Added a shared lesson-draft contract and controlled updates for saved steps, selections, submissions, and confidence.
2. Extended feedback and haptics to every lesson question and preserved submitted answers on review.
3. Restored the gold price-outcome card with large prices and gain/loss coloring.
4. Reviewed the integrated persistence code and identified reset, review-cleanup, completion-event, and recovery issues for the primary agent to fix.
5. Added a feedback-view callback for scrolling and compact bulleted vocabulary; formatted and typechecked its work.

**Home and market agent**

1. Locked general Practice until both lessons are complete and added Resume labels for unfinished lessons.
2. Blocked new guided orders until the selected reason is correct, recording each reasoning attempt separately.
3. Added direct Lesson 2 navigation after the ownership receipt and restricted that checkpoint to its guided order.
4. Changed receipt scrolling to target the explanation card and removed delay annotations from displayed provider labels.
5. Marked wrong reasoning with a red X and limited scrolling to once per receipt; typechecked its work.

**Primary integration agent**

1. Integrated practice access guards, the onboarding button label, draft persistence, and shared feedback scrolling.
2. Serialized cache/upload writes, preserved server-committed completions during recovery, cleared completed review drafts, and corrected reset/completion syncing.
3. Added prerequisite/draft/recovery tests and reviewed the agents' changes.
4. Walked through resume, all lesson questions, blocked reasoning, both guided trades, direct next-lesson navigation, and general Practice unlocking using the excluded synthetic session.
5. Ran TypeScript, all 15 tests, formatting checks, and exports for iOS, Android, and web; updated the architecture and validation notes.

## v4 follow-up

The three Terra agents again worked concurrently, using direct edits without Python. Each list follows that agent's order.

**Curriculum agent**

1. Removed the numbers from bakery share controls.
2. Fixed the ownership illustration at $225 → $210 and removed the lesson flow's variant prop, retaining historical assignment data.
3. Removed unsure answers from lessons while preserving onboarding choices; repaired older in-progress drafts containing removed options.
4. Updated content assertions and ran tests.
5. Updated README, study guidance, and architecture for v4, separating the new fixed-outcome flow from historical experiments.

**Portfolio agent**

1. Added shared company names/sectors and downloaded five local company favicons; visually inspected the assets and recorded their source.
2. Added a reusable logo component with a fallback.
3. Replaced Home's Practice entry with View portfolio and built a read-only balance, holdings, gain/loss, and activity screen.
4. Typechecked the integration and simplified the Home portfolio card copy.

**Market agent**

1. Moved reasoning feedback and attempt recording to Buy, keeping selections neutral before submission; greyed out unavailable Sell.
2. Added sector eligibility checks, default selection, disabled same-sector stocks, and a focused policy test.
3. Integrated persisted checkpoint receipts and the lesson-trade service contract; removed additional-order forms after a fill and added portfolio navigation.
4. Reviewed the new migration, service, and retry flow, identifying legacy attribution and receipt reconciliation issues.
5. Reconciled existing receipts and mismatched retry IDs, checked definitive RPC failures against saved status, and kept confirmed receipts navigable after local cleanup failures; typechecked the changes.

**Primary integration agent**

1. Wired portfolio navigation and lesson-only access; added the v4 content marker and updated progress validation.
2. Implemented lesson-trade adapters, migration 003, historical fill linking, server-side lesson/reasoning/sector checks, and once-only fills. Revoked direct client access to unrestricted orders; preserved legacy records.
3. Extended rollback and isolated hosted integration tests, applied the migration through Supabase, and verified both test suites.
4. Ran a fresh baseline, both lessons and purchases, wrong-reason checks, sector restrictions, reload checks, and portfolio review. Marked the walkthrough session for exclusion from research data.
5. Added visible sector labels and a specific diversification mission; ran TypeScript, all 16 tests, formatting and three-platform exports, then updated setup and validation documentation.

## Navigation and sector-feedback refinement

The same three Terra agents worked in parallel with direct edits and no Python.

1. The market agent removed sector-based disabling, kept selected stocks unchanged, moved sector feedback to Buy, and replaced the market Back text with an accessible arrow. It then ran TypeScript validation.
2. The portfolio agent moved Back left in onboarding and portfolio, replaced Back text with arrows, removed the portfolio's duplicate eyebrow, and ran TypeScript validation.
3. The curriculum agent moved the lesson Back arrow left, centered progress, retained Exit on the right, formatted its file, and ran TypeScript validation.
4. The primary agent consolidated the arrows into one shared 44-point Back control, added separate stock/sector fields to attempt events, and trimmed the remaining portfolio labels. It verified a rejected same-sector choice followed by a successful different-sector purchase, marked the synthetic session for exclusion, saved screenshots, and ran the checks recorded in `VALIDATION.md`.

# Onboarding confidence-order experiment

1. Replaced the lesson price-direction experiment with a session-stable onboarding assignment: A requests confidence first; B requests it after the identical ten-question quiz.
2. Added a small onboarding module for schedule construction, group mapping, and distinct-answer scoring. The existing server random bit is reused without rewriting historical records or requiring a migration.
3. Added quiz-run IDs, step-order events, selection changes, unknown flags, first/final summary scores and confidence, and raw unknown-selection counts. Events carry explicit experiment/group/timing/version metadata. Extended the administrative export queries.
4. Restored the fixed $225 → $210 ownership example and removed the retired outcome instrumentation.
5. Updated the notebook, study guide, architecture notes, and validation record. Verified both completed flows and answer revisions in an isolated browser fixture without database writes; TypeScript, 18 tests, and the web build passed.
