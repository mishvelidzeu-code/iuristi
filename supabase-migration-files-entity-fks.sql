-- გაუშვი ერთხელ არსებულ ბაზაზე (თუ უკვე გაქვს public.files ცხრილი ძველი სქემით).
-- ამატებს ფაილების მიბმას დოკუმენტებზე, ტრანსკრიფციებზე, ვადებზე, მოვლენებზე.

alter table public.files add column if not exists document_id uuid references public.documents(id) on delete cascade;
alter table public.files add column if not exists transcription_id uuid references public.transcriptions(id) on delete cascade;
alter table public.files add column if not exists deadline_id uuid references public.deadlines(id) on delete cascade;
alter table public.files add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete cascade;

create index if not exists idx_files_document_id on public.files(document_id);
create index if not exists idx_files_transcription_id on public.files(transcription_id);
create index if not exists idx_files_deadline_id on public.files(deadline_id);
create index if not exists idx_files_calendar_event_id on public.files(calendar_event_id);
