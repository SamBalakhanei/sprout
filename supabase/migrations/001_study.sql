-- Run once in the Supabase SQL editor. All monetary values are dollars.
create extension if not exists pgcrypto;
create table public.profiles (user_id uuid primary key references auth.users(id), active_session_id uuid);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  variant text not null check (variant in ('gain','loss')), progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id,id)
);
alter table public.profiles add constraint profile_active_session foreign key (user_id,active_session_id) references public.study_sessions(user_id,id);
create table public.study_events (
  event_id uuid primary key, user_id uuid not null, session_id uuid not null, event jsonb not null,
  created_at timestamptz not null default now(), foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
create table public.accounts (
  session_id uuid primary key, user_id uuid not null, balance numeric(14,2) not null default 1000 check (balance >= 0),
  foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
create table public.holdings (
  session_id uuid not null, user_id uuid not null, symbol text not null, shares integer not null check (shares >= 0), average_cost numeric(14,2) not null default 0,
  primary key (session_id,symbol), foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
create table public.market_quotes (
  symbol text primary key check (symbol in ('AAPL','MSFT','KO','JPM','WMT')),
  price numeric(14,2) not null check (price > 0), quoted_at timestamptz not null, source text not null,
  fetched_at timestamptz not null default now()
);
create table public.trades (
  id uuid primary key default gen_random_uuid(), order_id uuid not null, user_id uuid not null, session_id uuid not null,
  symbol text not null, side text not null check (side in ('buy','sell')), shares integer not null check (shares > 0),
  price numeric(14,2) not null, total numeric(14,2) not null, quote_at timestamptz not null, quote_source text not null,
  cash_after numeric(14,2) not null, created_at timestamptz not null default now(), unique (user_id,order_id),
  foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
create table public.lesson_rewards (
  user_id uuid not null, session_id uuid not null, lesson_id text not null, amount numeric(14,2) not null,
  created_at timestamptz not null default now(), primary key (session_id,lesson_id),
  foreign key (user_id,session_id) references public.study_sessions(user_id,id)
);
alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_events enable row level security;
alter table public.accounts enable row level security;
alter table public.holdings enable row level security;
alter table public.trades enable row level security;
alter table public.lesson_rewards enable row level security;
alter table public.market_quotes enable row level security;
create policy profile_read on public.profiles for select to authenticated using (user_id = auth.uid());
create policy session_read on public.study_sessions for select to authenticated using (user_id = auth.uid());
create policy session_update on public.study_sessions for update to authenticated using (user_id = auth.uid() and id = (select active_session_id from public.profiles where user_id = auth.uid())) with check (user_id = auth.uid());
-- Restrict client updates to progress only; variants and ownership are server controlled.
revoke update on public.study_sessions from authenticated;
grant update (progress,updated_at) on public.study_sessions to authenticated;
create policy event_read on public.study_events for select to authenticated using (user_id = auth.uid());
create policy event_insert on public.study_events for insert to authenticated with check (user_id = auth.uid());
create policy account_read on public.accounts for select to authenticated using (user_id = auth.uid());
create policy holding_read on public.holdings for select to authenticated using (user_id = auth.uid());
create policy trade_read on public.trades for select to authenticated using (user_id = auth.uid());
create policy reward_read on public.lesson_rewards for select to authenticated using (user_id = auth.uid());
create policy quote_read on public.market_quotes for select to authenticated using (true);

create or replace function public.new_study_session() returns public.study_sessions
language plpgsql security definer set search_path = public as $$
declare s public.study_sessions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.profiles(user_id) values(auth.uid()) on conflict do nothing;
  perform 1 from public.profiles where user_id=auth.uid() for update;
  insert into public.study_sessions(user_id,variant) values(auth.uid(), case when random() < 0.5 then 'gain' else 'loss' end) returning * into s;
  insert into public.accounts(user_id,session_id) values(auth.uid(),s.id);
  update public.profiles set active_session_id=s.id where user_id=auth.uid();
  return s;
end $$;
create or replace function public.current_study_session() returns public.study_sessions
language plpgsql security definer set search_path = public as $$
declare s public.study_sessions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.profiles(user_id) values(auth.uid()) on conflict do nothing;
  perform 1 from public.profiles where user_id=auth.uid() for update;
  select ss.* into s from public.study_sessions ss join public.profiles p on p.active_session_id=ss.id where p.user_id=auth.uid();
  if s.id is null then return public.new_study_session(); end if;
  return s;
end $$;
create or replace function public.complete_lesson(p_session_id uuid,p_lesson_id text,p_result jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.profiles where user_id=auth.uid() and active_session_id=p_session_id for update;
  if not found then raise exception 'Inactive session'; end if;
  -- Answers are first attempts, including mistakes; feedback is part of learning.
  if p_lesson_id is null or p_lesson_id not in ('ownership','diversification') or jsonb_typeof(p_result) is distinct from 'object'
    or jsonb_typeof(p_result->'checkAnswers') is distinct from 'array'
    or jsonb_typeof(p_result->'afterAnswers') is distinct from 'array' then
    raise exception 'Invalid lesson result';
  end if;
  if jsonb_array_length(p_result->'checkAnswers') <> 3 or jsonb_array_length(p_result->'afterAnswers') <> 2
    or exists (select 1 from jsonb_array_elements(p_result->'checkAnswers') x where x not in ('0'::jsonb,'1'::jsonb,'2'::jsonb))
    or exists (select 1 from jsonb_array_elements(p_result->'afterAnswers') x where x not in ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb))
    or coalesce(p_result->'reasoning' not in ('0'::jsonb,'1'::jsonb,'2'::jsonb),true)
    or coalesce(p_result->'transferAnswer' not in ('0'::jsonb,'1'::jsonb,'2'::jsonb),true)
    or coalesce(p_result->'confidence' not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb),true)
    or jsonb_typeof(p_result->'completedOn') is distinct from 'string'
    or coalesce(p_result->>'completedOn' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',true) then
    raise exception 'Invalid lesson result';
  end if;
  insert into public.lesson_rewards(user_id,session_id,lesson_id,amount) values(auth.uid(),p_session_id,p_lesson_id,1000) on conflict do nothing;
  if found then
    update public.accounts set balance=balance+1000 where user_id=auth.uid() and session_id=p_session_id;
    update public.study_sessions set progress=jsonb_set(jsonb_set(progress, '{lessons}', coalesce(progress->'lessons','{}'::jsonb), true), array['lessons',p_lesson_id], p_result, true), updated_at=now() where id=p_session_id;
  end if;
end $$;
create or replace function public.place_trade(p_session_id uuid,p_order_id uuid,p_symbol text,p_side text,p_shares integer) returns public.trades
language plpgsql security definer set search_path = public as $$
declare q public.market_quotes; a public.accounts; t public.trades; held integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  -- Serialize all orders for a user, including retries and orders in different sessions.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into t from public.trades where user_id=auth.uid() and order_id=p_order_id;
  if found then
    if t.session_id<>p_session_id or t.symbol<>p_symbol or t.side<>p_side or t.shares<>p_shares then raise exception 'Order ID already used'; end if;
    return t;
  end if;
  perform 1 from public.profiles where user_id=auth.uid() and active_session_id=p_session_id for update;
  if not found then raise exception 'Inactive session'; end if;
  if p_order_id is null or p_symbol not in ('AAPL','MSFT','KO','JPM','WMT') or p_side not in ('buy','sell') or p_shares is null or p_shares < 1 or p_shares > 100000 then raise exception 'Invalid order'; end if;
  select * into q from public.market_quotes where symbol=p_symbol;
  if not found or q.fetched_at < now()-interval '24 hours' or q.quoted_at < now()-interval '7 days' or q.quoted_at > now()+interval '5 minutes' then raise exception 'Quote unavailable or stale'; end if;
  select * into a from public.accounts where session_id=p_session_id and user_id=auth.uid() for update;
  if p_side='buy' then
    if a.balance < q.price*p_shares then raise exception 'Insufficient balance'; end if;
    update public.accounts set balance=balance-q.price*p_shares where session_id=p_session_id;
    insert into public.holdings(session_id,user_id,symbol,shares,average_cost) values(p_session_id,auth.uid(),p_symbol,p_shares,q.price)
      on conflict(session_id,symbol) do update set average_cost=round((public.holdings.average_cost*public.holdings.shares+excluded.average_cost*excluded.shares)/(public.holdings.shares+excluded.shares),2), shares=public.holdings.shares+excluded.shares;
  else
    select shares into held from public.holdings where session_id=p_session_id and symbol=p_symbol for update;
    if coalesce(held,0)<p_shares then raise exception 'Insufficient shares'; end if;
    update public.holdings set shares=shares-p_shares where session_id=p_session_id and symbol=p_symbol;
    update public.accounts set balance=balance+q.price*p_shares where session_id=p_session_id;
  end if;
  insert into public.trades(order_id,user_id,session_id,symbol,side,shares,price,total,quote_at,quote_source,cash_after)
    values(p_order_id,auth.uid(),p_session_id,p_symbol,p_side,p_shares,q.price,q.price*p_shares,q.quoted_at,q.source,(select balance from public.accounts where session_id=p_session_id)) returning * into t;
  return t;
end $$;
revoke all on function public.new_study_session(), public.current_study_session(), public.complete_lesson(uuid,text,jsonb), public.place_trade(uuid,uuid,text,text,integer) from public;
grant execute on function public.new_study_session(), public.current_study_session(), public.complete_lesson(uuid,text,jsonb), public.place_trade(uuid,uuid,text,text,integer) to authenticated;
