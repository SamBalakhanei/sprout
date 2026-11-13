-- Run after migration in the SQL editor as the project owner. Everything is rolled back.
begin;
insert into auth.users (id, aud, role) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated');
insert into public.market_quotes(symbol,price,quoted_at,source,fetched_at)
values('AAPL',100,now(),'test fixture',now()),('MSFT',100,now(),'test fixture',now()),('KO',100,now(),'test fixture',now())
on conflict(symbol) do update set price=excluded.price, quoted_at=excluded.quoted_at, source=excluded.source, fetched_at=excluded.fetched_at;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select public.current_study_session();
do $$
declare s uuid; b numeric; result jsonb := '{"checkAnswers":[0,1,0],"reasoning":2,"transferAnswer":1,"afterAnswers":[3,0],"confidence":2,"completedOn":"2026-11-09"}';
begin
  select active_session_id into s from public.profiles where user_id=auth.uid();
  select balance into b from public.accounts where session_id=s;
  if b <> 1000 then raise exception 'Initial balance mismatch'; end if;
  begin
    perform public.complete_lesson(s,'diversification',result);
    raise exception 'Diversification prerequisite not enforced';
  exception when raise_exception then
    if sqlerrm <> 'Complete ownership before diversification' then raise; end if;
  end;
  if (select balance from public.accounts where session_id=s) <> 1000 then raise exception 'Blocked lesson changed balance'; end if;
  perform public.complete_lesson(s,'ownership',result);
  perform public.complete_lesson(s,'ownership',result);
  select balance into b from public.accounts where session_id=s;
  if b <> 2000 then raise exception 'Reward was not idempotent'; end if;
  if (select progress->'lessons'->'ownership' from public.study_sessions where id=s) <> result then raise exception 'First-attempt answers not preserved'; end if;
  begin
    perform public.complete_lesson(s,'diversification',result || '{"checkAnswers":[9,0,0]}'::jsonb);
    raise exception 'Malformed result accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid lesson result' then raise; end if;
  end;
  if (select balance from public.accounts where session_id=s) <> 2000 then raise exception 'Invalid reward changed balance'; end if;
  begin
    perform public.place_lesson_trade(s,'ownership','cccccccc-cccc-4ccc-cccc-cccccccccccc','AAPL',2,1);
    raise exception 'Wrong reasoning accepted';
  exception when raise_exception then
    if sqlerrm <> 'Review your reasoning before buying' then raise; end if;
  end;
  begin
    perform public.place_lesson_trade(s,'ownership','dddddddd-dddd-4ddd-dddd-dddddddddddd','AAPL',100000,0);
    raise exception 'Insufficient funds accepted';
  exception when raise_exception then
    if sqlerrm <> 'Insufficient balance' then raise; end if;
  end;
  perform public.place_lesson_trade(s,'ownership','cccccccc-cccc-4ccc-cccc-cccccccccccc','AAPL',2,0);
  perform public.place_lesson_trade(s,'ownership','cccccccc-cccc-4ccc-cccc-cccccccccccc','AAPL',2,0);
  perform public.place_lesson_trade(s,'ownership','dddddddd-dddd-4ddd-dddd-dddddddddddd','KO',3,0);
  if (select balance from public.accounts where session_id=s) <> 1800 or (select shares from public.holdings where session_id=s and symbol='AAPL') <> 2 then raise exception 'Order retry was not idempotent'; end if;
  if (select count(*) from public.trades where session_id=s) <> 1 then raise exception 'Extra ownership trade accepted'; end if;
  perform public.complete_lesson(s,'diversification',result);
  perform public.complete_lesson(s,'diversification',result);
  if (select balance from public.accounts where session_id=s) <> 2800 then raise exception 'Diversification reward was not granted exactly once'; end if;
  begin
    perform public.place_lesson_trade(s,'diversification','eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee','MSFT',1,0);
    raise exception 'Same-sector trade accepted';
  exception when raise_exception then
    if sqlerrm <> 'Choose a company in a different sector' then raise; end if;
  end;
  perform public.place_lesson_trade(s,'diversification','eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee','KO',1,0);
  perform public.place_lesson_trade(s,'diversification','ffffffff-ffff-4fff-ffff-ffffffffffff','JPM',1,0);
  if (select count(*) from public.trades where session_id=s) <> 2
    or (select balance from public.accounts where session_id=s) <> 2700 then raise exception 'Extra diversification trade accepted'; end if;
  if has_function_privilege('authenticated','public.place_trade(uuid,uuid,text,text,integer)','EXECUTE') then raise exception 'Unrestricted trading still exposed'; end if;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',true);
do $$
begin
  if exists(select 1 from public.study_sessions) or exists(select 1 from public.accounts) or exists(select 1 from public.trades) or exists(select 1 from public.lesson_trades) then raise exception 'Another user can see private data'; end if;
  perform public.current_study_session();
  if (select balance from public.accounts limit 1) <> 1000 then raise exception 'Second user account incorrect'; end if;
end $$;
rollback;
