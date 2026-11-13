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
