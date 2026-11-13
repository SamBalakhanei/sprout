-- Diversification unlocks only after ownership is completed in the same session.
create function public.check_lesson_prerequisite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lesson_id = 'diversification' and not exists (
    select 1 from public.lesson_rewards
    where session_id = new.session_id and user_id = new.user_id and lesson_id = 'ownership'
  ) then
    raise exception 'Complete ownership before diversification';
  end if;
  return new;
end $$;
create trigger lesson_prerequisite before insert on public.lesson_rewards
for each row execute function public.check_lesson_prerequisite();
