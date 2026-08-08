-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security (doc 06 §4)
--
-- The answer to "what enforces tenant isolation here?" for everything the anon key can reach.
-- The service-role key used by SupabaseRepository bypasses RLS by design; that key is
-- server-only and never reaches a browser bundle (doc 10 §5).
-- ═══════════════════════════════════════════════════════════════════════════════

alter table orgs               enable row level security;
alter table operators          enable row level security;
alter table catalogues         enable row level security;
alter table titles             enable row level security;
alter table albums             enable row level security;
alter table photos             enable row level security;
alter table profiles           enable row level security;
alter table playback_progress  enable row level security;
alter table module_state       enable row level security;
alter table play_events        enable row level security;
alter table usage_rollup       enable row level security;

-- Resolves the caller's org once per statement. STABLE so the planner can cache it.
create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from operators where id = auth.uid()
$$;

-- ── Operators: their own org, and nothing else ─────────────────────────────────
create policy op_orgs on orgs for select to authenticated
  using (id = current_org_id());

create policy op_self on operators for select to authenticated
  using (org_id = current_org_id());

create policy op_catalogues on catalogues for all to authenticated
  using      (org_id = current_org_id())
  with check (org_id = current_org_id());

create policy op_titles on titles for all to authenticated
  using      (exists (select 1 from catalogues c where c.id = titles.catalogue_id and c.org_id = current_org_id()))
  with check (exists (select 1 from catalogues c where c.id = titles.catalogue_id and c.org_id = current_org_id()));

create policy op_albums on albums for all to authenticated
  using      (exists (select 1 from catalogues c where c.id = albums.catalogue_id and c.org_id = current_org_id()))
  with check (exists (select 1 from catalogues c where c.id = albums.catalogue_id and c.org_id = current_org_id()));

create policy op_photos on photos for all to authenticated
  using (exists (
    select 1 from albums a join catalogues c on c.id = a.catalogue_id
     where a.id = photos.album_id and c.org_id = current_org_id()))
  with check (exists (
    select 1 from albums a join catalogues c on c.id = a.catalogue_id
     where a.id = photos.album_id and c.org_id = current_org_id()));

create policy op_usage on usage_rollup for select to authenticated
  using (exists (select 1 from catalogues c where c.id = usage_rollup.catalogue_id and c.org_id = current_org_id()));

create policy op_play_events on play_events for select to authenticated
  using (exists (select 1 from catalogues c where c.id = play_events.catalogue_id and c.org_id = current_org_id()));

-- ── Guests (anon) ──────────────────────────────────────────────────────────────

-- A catalogue is visible only while published AND serving. `cold` and `lapsed` are excluded
-- here; the renewal screen is rendered server-side from the service role, so the couple still
-- sees their catalogue listed — it is simply not served to an anon client.
create policy anon_catalogues on catalogues for select to anon
  using (status = 'published' and sub_status in ('included','active','grace'));

create policy anon_titles on titles for select to anon
  using (published and status = 'ready' and exists (
    select 1 from catalogues c
     where c.id = titles.catalogue_id
       and c.status = 'published'
       and c.sub_status in ('included','active','grace')));

create policy anon_albums on albums for select to anon
  using (exists (
    select 1 from catalogues c
     where c.id = albums.catalogue_id
       and c.status = 'published'
       and c.sub_status in ('included','active','grace')));

create policy anon_photos on photos for select to anon
  using (exists (
    select 1 from albums a join catalogues c on c.id = a.catalogue_id
     where a.id = photos.album_id
       and c.status = 'published'
       and c.sub_status in ('included','active','grace')));

-- Profiles are write-only to a guest: they may create one, and may not read anyone else's.
create policy anon_profiles_insert on profiles for insert to anon
  with check (exists (
    select 1 from catalogues c
     where c.id = profiles.catalogue_id
       and c.status = 'published'
       and c.sub_status in ('included','active','grace')));

-- Guests write only their own progress.
--
-- doc 06 §4's note applies and is the reason this is acceptable: `profile_id` is an
-- unguessable UUID held client-side and this table holds no personal data — a label like
-- "Bride's side", a title id, and a number of seconds. **Do not add a guest name or phone
-- to this table**; the moment you do, this policy becomes a leak, and the fix is signed guest
-- tokens, not a tighter predicate here.
create policy anon_progress on playback_progress for all to anon
  using (true) with check (true);

create policy anon_module_state on module_state for all to anon
  using (true) with check (true);

-- Play events are append-only from the guest side and never readable by one.
create policy anon_play_events_insert on play_events for insert to anon
  with check (exists (
    select 1 from catalogues c
     where c.id = play_events.catalogue_id
       and c.status = 'published'
       and c.sub_status in ('included','active','grace')));
