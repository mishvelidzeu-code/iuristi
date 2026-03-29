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

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  client_name text not null,
  invoice_number text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Paid', 'Overdue', 'Partially Paid')),
  payment_model text not null default 'Hourly' check (payment_model in ('Flat fee', 'Hourly', 'Contingency', 'Retainer drawdown')),
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'GEL',
  service_amount numeric(12,2) not null default 0,
  subtotal_hours numeric(12,2) not null default 0,
  subtotal_expenses numeric(12,2) not null default 0,
  adjustments numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.retainers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  client_name text not null,
  deposit_date date not null default current_date,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Closed', 'Refunded')),
  reference_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  client_name text,
  work_type text not null,
  description text,
  entry_date date not null default current_date,
  hours numeric(10,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  billing_target text not null default 'invoice' check (billing_target in ('invoice', 'retainer')),
  invoice_id uuid references public.invoices(id) on delete set null,
  retainer_id uuid references public.retainers(id) on delete set null,
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  client_name text,
  expense_type text not null,
  description text,
  expense_date date not null default current_date,
  amount numeric(12,2) not null default 0,
  billing_target text not null default 'invoice' check (billing_target in ('invoice', 'retainer')),
  invoice_id uuid references public.invoices(id) on delete set null,
  retainer_id uuid references public.retainers(id) on delete set null,
  status text not null default 'Open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_retainers_updated_at on public.retainers;
create trigger set_retainers_updated_at
before update on public.retainers
for each row
execute function public.set_updated_at();

drop trigger if exists set_billable_entries_updated_at on public.billable_entries;
create trigger set_billable_entries_updated_at
before update on public.billable_entries
for each row
execute function public.set_updated_at();

drop trigger if exists set_case_expenses_updated_at on public.case_expenses;
create trigger set_case_expenses_updated_at
before update on public.case_expenses
for each row
execute function public.set_updated_at();

alter table public.invoices enable row level security;
alter table public.retainers enable row level security;
alter table public.billable_entries enable row level security;
alter table public.case_expenses enable row level security;

drop policy if exists "Users can view own invoices" on public.invoices;
create policy "Users can view own invoices"
on public.invoices
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own invoices" on public.invoices;
create policy "Users can insert own invoices"
on public.invoices
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own invoices" on public.invoices;
create policy "Users can update own invoices"
on public.invoices
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own invoices" on public.invoices;
create policy "Users can delete own invoices"
on public.invoices
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own retainers" on public.retainers;
create policy "Users can view own retainers"
on public.retainers
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own retainers" on public.retainers;
create policy "Users can insert own retainers"
on public.retainers
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own retainers" on public.retainers;
create policy "Users can update own retainers"
on public.retainers
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own retainers" on public.retainers;
create policy "Users can delete own retainers"
on public.retainers
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own billable entries" on public.billable_entries;
create policy "Users can view own billable entries"
on public.billable_entries
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own billable entries" on public.billable_entries;
create policy "Users can insert own billable entries"
on public.billable_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own billable entries" on public.billable_entries;
create policy "Users can update own billable entries"
on public.billable_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own billable entries" on public.billable_entries;
create policy "Users can delete own billable entries"
on public.billable_entries
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own case expenses" on public.case_expenses;
create policy "Users can view own case expenses"
on public.case_expenses
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own case expenses" on public.case_expenses;
create policy "Users can insert own case expenses"
on public.case_expenses
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own case expenses" on public.case_expenses;
create policy "Users can update own case expenses"
on public.case_expenses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own case expenses" on public.case_expenses;
create policy "Users can delete own case expenses"
on public.case_expenses
for delete
using (auth.uid() = user_id);
