create extension if not exists "pgcrypto";

-- უკვე არსებულ ბაზაზე ხელახლა გაშვებისას enum-ები არ უნდა ჩაირტყმას (42710 duplicate_object).
do $$ begin create type public.user_role as enum ('lawyer', 'prosecutor', 'judge', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.case_status as enum ('active', 'pending', 'closed', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transaction_type as enum ('topup', 'usage', 'refund', 'manual_adjustment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transcription_status as enum ('uploaded', 'processing', 'completed', 'failed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.document_status as enum ('draft', 'generated', 'signed', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.deadline_status as enum ('upcoming', 'done', 'missed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.file_kind as enum ('audio', 'document', 'scan', 'evidence', 'other'); exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'lawyer',
  first_name text not null default '',
  last_name text not null default '',
  bureau_name text,
  phone text,
  sheet_url text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_type public.transaction_type not null,
  amount numeric(12,2) not null,
  minutes_used integer default 0,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  personal_id text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  case_number text,
  court_name text,
  status public.case_status not null default 'active',
  description text,
  hearing_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  title text not null,
  source_file_path text,
  language_code text not null default 'ka',
  status public.transcription_status not null default 'uploaded',
  raw_text text,
  edited_text text,
  docx_file_path text,
  duration_seconds integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  template_body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  template_id uuid references public.document_templates(id) on delete set null,
  title text not null,
  status public.document_status not null default 'draft',
  generated_data jsonb not null default '{}'::jsonb,
  body text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  title text not null,
  base_date date not null,
  due_date date not null,
  remind_3_days boolean not null default true,
  remind_1_day boolean not null default true,
  remind_same_day boolean not null default true,
  status public.deadline_status not null default 'upcoming',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  document_id uuid references public.documents(id) on delete cascade,
  transcription_id uuid references public.transcriptions(id) on delete cascade,
  deadline_id uuid references public.deadlines(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete cascade,
  file_kind public.file_kind not null default 'document',
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_calculations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tool_name text not null,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  transcription_id uuid references public.transcriptions(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  provider text,
  model text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_user_id on public.wallet_transactions(user_id);
create index if not exists idx_clients_owner_id on public.clients(owner_id);
create index if not exists idx_cases_owner_id on public.cases(owner_id);
create index if not exists idx_cases_client_id on public.cases(client_id);
create index if not exists idx_transcriptions_owner_id on public.transcriptions(owner_id);
create index if not exists idx_transcriptions_case_id on public.transcriptions(case_id);
create index if not exists idx_documents_owner_id on public.documents(owner_id);
create index if not exists idx_documents_case_id on public.documents(case_id);
create index if not exists idx_deadlines_owner_id on public.deadlines(owner_id);
create index if not exists idx_deadlines_case_id on public.deadlines(case_id);
create index if not exists idx_calendar_events_owner_id on public.calendar_events(owner_id);
create index if not exists idx_files_owner_id on public.files(owner_id);
create index if not exists idx_files_case_id on public.files(case_id);
create index if not exists idx_files_client_id on public.files(client_id);
create index if not exists idx_files_document_id on public.files(document_id);
create index if not exists idx_files_transcription_id on public.files(transcription_id);
create index if not exists idx_files_deadline_id on public.files(deadline_id);
create index if not exists idx_files_calendar_event_id on public.files(calendar_event_id);
create index if not exists idx_ai_jobs_owner_id on public.ai_jobs(owner_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at before update on public.cases for each row execute function public.set_updated_at();

drop trigger if exists trg_transcriptions_updated_at on public.transcriptions;
create trigger trg_transcriptions_updated_at before update on public.transcriptions for each row execute function public.set_updated_at();

drop trigger if exists trg_document_templates_updated_at on public.document_templates;
create trigger trg_document_templates_updated_at before update on public.document_templates for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

drop trigger if exists trg_deadlines_updated_at on public.deadlines;
create trigger trg_deadlines_updated_at before update on public.deadlines for each row execute function public.set_updated_at();

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();

drop trigger if exists trg_ai_jobs_updated_at on public.ai_jobs;
create trigger trg_ai_jobs_updated_at before update on public.ai_jobs for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, bureau_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'bureau_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.transcriptions enable row level security;
alter table public.document_templates enable row level security;
alter table public.documents enable row level security;
alter table public.deadlines enable row level security;
alter table public.calendar_events enable row level security;
alter table public.files enable row level security;
alter table public.tool_calculations enable row level security;
alter table public.ai_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "wallet_own_all" on public.wallet_transactions;
create policy "wallet_own_all" on public.wallet_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clients_own_all" on public.clients;
create policy "clients_own_all" on public.clients for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "cases_own_all" on public.cases;
create policy "cases_own_all" on public.cases for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "transcriptions_own_all" on public.transcriptions;
create policy "transcriptions_own_all" on public.transcriptions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "documents_own_all" on public.documents;
create policy "documents_own_all" on public.documents for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "deadlines_own_all" on public.deadlines;
create policy "deadlines_own_all" on public.deadlines for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "calendar_events_own_all" on public.calendar_events;
create policy "calendar_events_own_all" on public.calendar_events for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "files_own_all" on public.files;
create policy "files_own_all" on public.files for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "tools_own_all" on public.tool_calculations;
create policy "tools_own_all" on public.tool_calculations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "ai_jobs_own_all" on public.ai_jobs;
create policy "ai_jobs_own_all" on public.ai_jobs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "templates_read_all_authenticated" on public.document_templates;
create policy "templates_read_all_authenticated" on public.document_templates for select to authenticated using (true);

insert into storage.buckets (id, name, public)
values
  ('audio-files', 'audio-files', false),
  ('case-files', 'case-files', false),
  ('generated-docx', 'generated-docx', false),
  ('scans', 'scans', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "audio_files_read_own" on storage.objects;
create policy "audio_files_read_own" on storage.objects for select to authenticated using (
  bucket_id = 'audio-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "audio_files_insert_own" on storage.objects;
create policy "audio_files_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'audio-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "audio_files_update_own" on storage.objects;
create policy "audio_files_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'audio-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "audio_files_delete_own" on storage.objects;
create policy "audio_files_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'audio-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "case_files_read_own" on storage.objects;
create policy "case_files_read_own" on storage.objects for select to authenticated using (
  bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "case_files_insert_own" on storage.objects;
create policy "case_files_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "case_files_update_own" on storage.objects;
create policy "case_files_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "case_files_delete_own" on storage.objects;
create policy "case_files_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'case-files' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_docx_read_own" on storage.objects;
create policy "generated_docx_read_own" on storage.objects for select to authenticated using (
  bucket_id = 'generated-docx' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_docx_insert_own" on storage.objects;
create policy "generated_docx_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'generated-docx' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_docx_update_own" on storage.objects;
create policy "generated_docx_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'generated-docx' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "generated_docx_delete_own" on storage.objects;
create policy "generated_docx_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'generated-docx' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "scans_read_own" on storage.objects;
create policy "scans_read_own" on storage.objects for select to authenticated using (
  bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "scans_insert_own" on storage.objects;
create policy "scans_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "scans_update_own" on storage.objects;
create policy "scans_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "scans_delete_own" on storage.objects;
create policy "scans_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all" on storage.objects for select to authenticated using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
