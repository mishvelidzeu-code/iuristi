create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  contact_id uuid,
  invoice_id uuid references public.invoices(id) on delete set null,
  title text not null,
  template_key text not null default 'service',
  status text not null default 'დრაფტი'
    check (status in ('დრაფტი', 'მოქმედი', 'ხელმოწერილი', 'შეწყვეტილი')),
  client_name text,
  contract_date date not null default current_date,
  start_date date,
  end_date date,
  rendered_text text not null default '',
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_title text not null,
  status text not null default 'დრაფტი'
    check (status in ('დრაფტი', 'მოქმედი', 'ხელმოწერილი', 'შეწყვეტილი')),
  version_no integer not null default 1,
  rendered_text text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contracts_user_id_idx on public.contracts(user_id);
create index if not exists contracts_case_id_idx on public.contracts(case_id);
create index if not exists contracts_invoice_id_idx on public.contracts(invoice_id);
create index if not exists contract_history_user_id_idx on public.contract_history(user_id);
create index if not exists contract_history_contract_id_idx on public.contract_history(contract_id);

drop trigger if exists set_contracts_updated_at on public.contracts;

create trigger set_contracts_updated_at
before update on public.contracts
for each row
execute function public.set_updated_at();

alter table public.contracts enable row level security;
alter table public.contract_history enable row level security;

drop policy if exists "Users can view own contracts" on public.contracts;
create policy "Users can view own contracts"
on public.contracts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own contracts" on public.contracts;
create policy "Users can insert own contracts"
on public.contracts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own contracts" on public.contracts;
create policy "Users can update own contracts"
on public.contracts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own contracts" on public.contracts;
create policy "Users can delete own contracts"
on public.contracts
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own contract history" on public.contract_history;
create policy "Users can view own contract history"
on public.contract_history
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own contract history" on public.contract_history;
create policy "Users can insert own contract history"
on public.contract_history
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own contract history" on public.contract_history;
create policy "Users can update own contract history"
on public.contract_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own contract history" on public.contract_history;
create policy "Users can delete own contract history"
on public.contract_history
for delete
using (auth.uid() = user_id);
