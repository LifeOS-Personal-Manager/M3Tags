create table if not exists public.tag_records (
  id uuid primary key default gen_random_uuid(),
  document_id text not null unique,
  title text not null,
  domain text not null,
  subdomain text,
  stage text not null,
  element_type text,
  status text,
  priority text,
  next_action text,
  review_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tag_records_title_idx on public.tag_records using gin (to_tsvector('simple', title));
create index if not exists tag_records_domain_idx on public.tag_records (domain);
create index if not exists tag_records_stage_idx on public.tag_records (stage);
create index if not exists tag_records_status_idx on public.tag_records (status);
create index if not exists tag_records_review_date_idx on public.tag_records (review_date);

alter table public.tag_records enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.tag_records to anon;

drop policy if exists "tag_records_read_all" on public.tag_records;
drop policy if exists "tag_records_insert_all" on public.tag_records;
drop policy if exists "tag_records_update_all" on public.tag_records;
drop policy if exists "tag_records_delete_all" on public.tag_records;

create policy "tag_records_read_all"
on public.tag_records for select
to anon
using (true);

create policy "tag_records_insert_all"
on public.tag_records for insert
to anon
with check (true);

create policy "tag_records_update_all"
on public.tag_records for update
to anon
using (true)
with check (true);

create policy "tag_records_delete_all"
on public.tag_records for delete
to anon
using (true);
