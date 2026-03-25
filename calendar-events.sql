create extension if not exists "pgcrypto";

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_case_id uuid references public.cases(id) on delete set null,
  title text not null,
  category text not null default 'პირადი',
  event_date date not null,
  event_time time,
  reminder_date date,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;

create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "Users can view own calendar events" on public.calendar_events;
create policy "Users can view own calendar events"
on public.calendar_events
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own calendar events" on public.calendar_events;
create policy "Users can insert own calendar events"
on public.calendar_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendar events" on public.calendar_events;
create policy "Users can update own calendar events"
on public.calendar_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own calendar events" on public.calendar_events;
create policy "Users can delete own calendar events"
on public.calendar_events
for delete
using (auth.uid() = user_id);
