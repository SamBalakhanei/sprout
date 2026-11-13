-- Run each SELECT separately in the Supabase SQL editor as the project owner,
-- then download its result as CSV. session_id is the anonymous join key.
-- Sessions marked with an integration_test event are excluded from all exports.

-- 1. Sessions
select s.id as session_id, s.variant, s.progress, s.created_at, s.updated_at
from public.study_sessions s
where not exists (
  select 1 from public.study_events excluded
  where excluded.session_id = s.id and excluded.event->>'type' = 'integration_test'
)
order by s.created_at, s.id;

-- 2. Events
select e.session_id, e.event_id, e.event->>'type' as event_type,
  e.event->>'occurredAt' as occurred_at, e.event->'payload' as payload,
  e.created_at as received_at
from public.study_events e
where not exists (
  select 1 from public.study_events excluded
  where excluded.session_id = e.session_id and excluded.event->>'type' = 'integration_test'
)
order by e.created_at, e.event_id;

-- 3. Trades
select t.session_id, t.id as trade_id, t.order_id, t.symbol, t.side, t.shares,
  t.price, t.total, t.quote_at, t.quote_source, t.cash_after, t.created_at
from public.trades t
where not exists (
  select 1 from public.study_events excluded
  where excluded.session_id = t.session_id and excluded.event->>'type' = 'integration_test'
)
order by t.created_at, t.id;

-- 4. Completed onboarding experiment runs. Keep the first run per participant
-- during analysis; inspect step/selection events separately for incomplete runs.
select e.session_id, e.event->'payload'->>'quizRunId' as quiz_run_id,
  e.event->'payload'->>'group' as experiment_group,
  e.event->'payload'->>'confidenceTiming' as confidence_timing,
  e.event->'payload'->'first' as first_submission_scores,
  e.event->'payload'->'final' as final_submission_scores,
  e.event->'payload'->>'dontKnowSelections' as dont_know_selection_count,
  e.event->'payload'->'firstConfidence' as first_confidence,
  e.event->'payload'->'finalConfidence' as final_confidence,
  e.event->'payload'->>'durationMs' as duration_ms
from public.study_events e
where e.event->>'type' = 'onboarding_summary'
  and e.event->'payload'->>'experiment' = 'onboarding-confidence-order-v1'
  and e.event->'payload'->>'appVersion' = 'sprint4.v6'
  and not exists (
    select 1 from public.study_events excluded
    where excluded.session_id = e.session_id and excluded.event->>'type' = 'integration_test'
  )
order by e.created_at, e.event_id;
