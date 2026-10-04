-- TEST PROJECT SETUP ONLY.
-- The app does not sign users in, so its browser requests use the anon role.
-- These policies allow public access to test data. Do not use this setup for
-- real or sensitive inspection records.

begin;

create table if not exists public.clients (
  id text primary key,
  name text not null,
  rep text,
  email text
);

create table if not exists public.sites (
  id text primary key,
  "clientId" text,
  name text not null
);

create table if not exists public.audits (
  id text primary key,
  "clientId" text,
  "siteId" text,
  date date,
  "inspectorName" text,
  "inspectorQuals" text,
  "inspectorNotes" text,
  "auditorSignature" text,
  "siteRepName" text,
  "siteRepSignature" text,
  score text,
  status text,
  questions jsonb not null default '[]'::jsonb,
  "pdfUrl" text,
  "closedBy" text,
  "closedDate" text
);

create table if not exists public.supervisor_links (
  id text primary key,
  token text unique not null,
  supervisor_name text not null,
  project text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.app_branding (
  id text primary key check (id = 'default'),
  title text not null default 'Temporary Works UK',
  subtitle text not null default 'BS 5975 & CDM 2015 Compliance System',
  color text not null default '#075E54',
  text_color text not null default '#ffffff',
  logo_url text not null default '',
  footer_text text not null default 'Official Inspection Certificate.',
  updated_at timestamptz not null default now()
);

create index if not exists audits_client_id_idx on public.audits ("clientId");
create index if not exists audits_site_id_idx on public.audits ("siteId");

alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.audits enable row level security;
alter table public.supervisor_links enable row level security;
alter table public.app_branding enable row level security;

grant usage on schema public to anon;
revoke select, insert, update, delete
  on table public.clients, public.sites, public.audits, public.supervisor_links
  from authenticated;
revoke select, insert, update, delete on table public.app_branding from authenticated;
grant select, insert, update, delete
  on table public.clients, public.sites, public.audits, public.supervisor_links
  to anon;
grant select, insert, update on table public.app_branding to anon;

drop policy if exists "test app read branding" on public.app_branding;
create policy "test app read branding" on public.app_branding
  for select to anon using (true);

drop policy if exists "test app insert branding" on public.app_branding;
create policy "test app insert branding" on public.app_branding
  for insert to anon with check (id = 'default');

drop policy if exists "test app update branding" on public.app_branding;
create policy "test app update branding" on public.app_branding
  for update to anon using (id = 'default') with check (id = 'default');

drop policy if exists "test app full access" on public.clients;
create policy "test app full access" on public.clients
  for all to anon using (true) with check (true);

drop policy if exists "test app full access" on public.sites;
create policy "test app full access" on public.sites
  for all to anon using (true) with check (true);

drop policy if exists "test app full access" on public.audits;
create policy "test app full access" on public.audits
  for all to anon using (true) with check (true);

drop policy if exists "test app full access" on public.supervisor_links;
create policy "test app full access" on public.supervisor_links
  for all to anon using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do update set public = excluded.public;

grant usage on schema storage to anon;
revoke select, insert, update, delete on table storage.objects from authenticated;
grant select, insert, update, delete on table storage.objects to anon;

drop policy if exists "test app read report files" on storage.objects;
create policy "test app read report files" on storage.objects
  for select to anon
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] in ('tw', 'puwer', 'havs')
  );

drop policy if exists "test app upload report files" on storage.objects;
create policy "test app upload report files" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] in ('tw', 'puwer', 'havs')
  );

drop policy if exists "test app replace report files" on storage.objects;
create policy "test app replace report files" on storage.objects
  for update to anon
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] in ('tw', 'puwer', 'havs')
  )
  with check (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] in ('tw', 'puwer', 'havs')
  );

drop policy if exists "test app delete report files" on storage.objects;
create policy "test app delete report files" on storage.objects
  for delete to anon
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] in ('tw', 'puwer', 'havs')
  );

drop policy if exists "test app read branding logo" on storage.objects;
create policy "test app read branding logo" on storage.objects
  for select to anon using (bucket_id = 'branding-assets' and name like 'default/company-logo.%');

drop policy if exists "test app upload branding logo" on storage.objects;
create policy "test app upload branding logo" on storage.objects
  for insert to anon with check (bucket_id = 'branding-assets' and name like 'default/company-logo.%');

drop policy if exists "test app replace branding logo" on storage.objects;
create policy "test app replace branding logo" on storage.objects
  for update to anon
  using (bucket_id = 'branding-assets' and name like 'default/company-logo.%')
  with check (bucket_id = 'branding-assets' and name like 'default/company-logo.%');

commit;