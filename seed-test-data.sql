-- სატესტო მონაცემები LexFlow / Supabase
-- წინაპირობა: მინიმუმ ერთი რეგისტრირებული მომხმარებელი (auth.users + profiles ტრიგერით).
-- გაუშვი ერთხელ — ხელახლა გაშვება იგივე ტიპის ჩანაწერებს კიდევ ერთხელ დაუმატებს.
-- Supabase → SQL Editor → Run.

begin;

-- მფლობელი: პირველი შექმნილი auth მომხმარებელი
insert into public.clients (owner_id, first_name, last_name, phone, email, personal_id, address, notes)
select
  id,
  'სატესტო',
  'კლიენტი',
  '599111222',
  'test.client@example.com',
  '01000000000',
  'თბილისი',
  'სატესტო ჩანაწერი — საჭიროების შემდეგ წაშალე.'
from auth.users
order by created_at
limit 1;

insert into public.cases (owner_id, client_id, title, case_number, court_name, status, description, hearing_date)
select
  c.owner_id,
  c.id,
  'სატესტო საქმე — ხელშეკრულების დავა',
  'S-2025-DEMO-001',
  'თბილისის საქალაქო სასამართლო',
  'active',
  'დემო აღწერა: მხარეები, მოთხოვნა და საბოლოო მიზანი.',
  timezone('Asia/Tbilisi', now()) + interval '14 days'
from public.clients c
where c.owner_id = (select id from auth.users order by created_at limit 1)
order by c.created_at desc
limit 1;

insert into public.deadlines (owner_id, case_id, title, base_date, due_date, status, notes)
select
  k.owner_id,
  k.id,
  'აპელაციის წარდგენის ვადა (სატესტო)',
  (timezone('Asia/Tbilisi', now()))::date,
  (timezone('Asia/Tbilisi', now()) + interval '5 days')::date,
  'upcoming',
  'სატესტო ვადა — კალენდარში სანახავად.'
from public.cases k
where k.owner_id = (select id from auth.users order by created_at limit 1)
order by k.created_at desc
limit 1;

insert into public.calendar_events (owner_id, case_id, title, location, starts_at, ends_at, notes)
select
  k.owner_id,
  k.id,
  'სხდომა — სატესტო',
  'თბილისის საქალაქო სასამართლო, დარბაზი 3',
  timezone('Asia/Tbilisi', now()) + interval '3 days' + interval '11 hours',
  timezone('Asia/Tbilisi', now()) + interval '3 days' + interval '13 hours',
  'სატესტო მოვლენა დეშბორდისთვის.'
from public.cases k
where k.owner_id = (select id from auth.users order by created_at limit 1)
order by k.created_at desc
limit 1;

insert into public.documents (owner_id, case_id, client_id, title, status, body, generated_data)
select
  k.owner_id,
  k.id,
  k.client_id,
  'სატესტო საჩივარი (draft)',
  'draft',
  'ეს არის სატესტო ტექსტი დოკუმენტების გვერდისთვის.',
  '{}'::jsonb
from public.cases k
where k.owner_id = (select id from auth.users order by created_at limit 1)
order by k.created_at desc
limit 1;

insert into public.transcriptions (owner_id, case_id, title, language_code, status, raw_text, edited_text, duration_seconds)
select
  k.owner_id,
  k.id,
  'სატესტო ტრანსკრიფცია',
  'ka',
  'completed',
  'სატესტო ნედლი ტექსტი.',
  'სატესტო რედაქტირებული ტექსტი.',
  120
from public.cases k
where k.owner_id = (select id from auth.users order by created_at limit 1)
order by k.created_at desc
limit 1;

insert into public.wallet_transactions (user_id, transaction_type, amount, minutes_used, description)
select
  id,
  'topup',
  50.00,
  0,
  'სატესტო ბალანსის ჩარიცხვა'
from auth.users
order by created_at
limit 1;

-- ბაზაში მხოლოდ ჩანაწერია; Storage-ში ფაილი არ იქმნება (სურვილისამებრ წაშალე ეს INSERT).
insert into public.files (owner_id, case_id, file_kind, file_name, storage_path, mime_type, size_bytes)
select
  k.owner_id,
  k.id,
  'document',
  'demo-note.txt',
  k.owner_id::text || '/cases/' || k.id::text || '/demo-note.txt',
  'text/plain',
  12
from public.cases k
where k.owner_id = (select id from auth.users order by created_at limit 1)
order by k.created_at desc
limit 1;

insert into public.document_templates (title, category, description, template_body, is_active)
values (
  'სატესტო შაბლონი',
  'სამოქალაქო',
  'დემო შაბლონი — საჭიროების შემდეგ წაშალე ან გამორთე.',
  'შაბლონის სხელი: {{სახელი}}, თარიღი: {{თარიღი}}',
  true
);

commit;
