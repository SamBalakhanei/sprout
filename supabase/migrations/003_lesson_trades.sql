-- One recorded buy per lesson, including retries, reloads, and lesson reviews.
begin;
create table public.lesson_trades (
  session_id uuid not null,
  user_id uuid not null,
  lesson_id text not null check (lesson_id in ('ownership','diversification')),
  trade_id uuid not null unique references public.trades(id),
  primary key (session_id,lesson_id),
  foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
alter table public.lesson_trades enable row level security;
create policy lesson_trade_read on public.lesson_trades for select to authenticated using (user_id=auth.uid());

-- Preserve the first previously recorded guided fill. Historical extra trades remain intact.
insert into public.lesson_trades(session_id,user_id,lesson_id,trade_id)
select distinct on (t.session_id,e.event->'payload'->>'lessonId')
  t.session_id,t.user_id,e.event->'payload'->>'lessonId',t.id
from public.trades t join public.study_events e
  on e.session_id=t.session_id and e.user_id=t.user_id
  and e.event->'payload'->>'orderId'=t.order_id::text
where e.event->>'type'='trade_completed'
  and e.event->'payload'->>'lessonId' in ('ownership','diversification')
  and e.event->'payload'->>'reasoningCorrect'='true'
order by t.session_id,e.event->'payload'->>'lessonId',t.created_at,e.event_id;

create function public.company_sector(symbol text) returns text
language sql immutable set search_path=public as $$
  select case symbol when 'AAPL' then 'Technology' when 'MSFT' then 'Technology'
    when 'KO' then 'Consumer staples' when 'WMT' then 'Consumer staples'
    when 'JPM' then 'Financials' end;
$$;

create function public.place_lesson_trade(
  p_session_id uuid,p_lesson_id text,p_order_id uuid,p_symbol text,p_shares integer,p_reason integer
) returns public.trades
language plpgsql security definer set search_path=public as $$
declare filled public.trades; sector text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  -- Same lock order as place_trade; serializes concurrent submissions and retries.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  perform 1 from public.profiles where user_id=auth.uid() and active_session_id=p_session_id for update;
  if not found then raise exception 'Inactive session'; end if;
  select t.* into filled from public.lesson_trades l join public.trades t on t.id=l.trade_id
    where l.session_id=p_session_id and l.user_id=auth.uid() and l.lesson_id=p_lesson_id;
  if found then return filled; end if;
  -- Never infer a missing legacy lesson attribution or allow another fill around it.
  if exists(select 1 from public.trades t left join public.lesson_trades l on l.trade_id=t.id
    where t.session_id=p_session_id and t.user_id=auth.uid() and l.trade_id is null)
    then raise exception 'This earlier session has unmatched trades. Start a new session for the updated checkpoints.'; end if;
  if p_lesson_id is null or p_lesson_id not in ('ownership','diversification')
    or not exists(select 1 from public.lesson_rewards where session_id=p_session_id and user_id=auth.uid() and lesson_id=p_lesson_id)
    then raise exception 'Complete this lesson before its trade'; end if;
  if p_reason is distinct from 0 then raise exception 'Review your reasoning before buying'; end if;
  sector := public.company_sector(p_symbol);
  if sector is null then raise exception 'Unknown company sector'; end if;
  if p_lesson_id='diversification' then
    if not exists(select 1 from public.lesson_trades where session_id=p_session_id and lesson_id='ownership')
      or not exists(select 1 from public.holdings where session_id=p_session_id and shares>0)
      then raise exception 'Complete the lesson 1 trade first'; end if;
    if exists(select 1 from public.holdings where session_id=p_session_id and shares>0
      and (public.company_sector(symbol) is null or public.company_sector(symbol)=sector))
      then raise exception 'Choose a company in a different sector'; end if;
  end if;
  filled := public.place_trade(p_session_id,p_order_id,p_symbol,'buy',p_shares);
  insert into public.lesson_trades(session_id,user_id,lesson_id,trade_id)
    values(p_session_id,auth.uid(),p_lesson_id,filled.id);
  return filled;
end $$;

-- The app now trades exclusively through the validated lesson checkpoint.
revoke execute on function public.place_trade(uuid,uuid,text,text,integer) from authenticated;
revoke all on function public.company_sector(text), public.place_lesson_trade(uuid,text,uuid,text,integer,integer) from public;
grant execute on function public.place_lesson_trade(uuid,text,uuid,text,integer,integer) to authenticated;
commit;
