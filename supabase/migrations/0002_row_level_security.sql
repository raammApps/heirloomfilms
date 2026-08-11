-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security (doc 06 §4)
--
-- The answer to "what enforces tenant isolation here?" for everything the anon key can reach.
-- The service-role key used by SupabaseRepository bypasses RLS by design; that key is
-- server-only and never reaches a browser bundle (doc 10 §5).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Re-runnable: every policy below is dropped first, so applying this file twice is safe.
-- Migrations here are pasted into the SQL editor by hand (PostgREST executes no DDL), and a
-- file that only works on a virgin database is a file nobody dares re-apply.
drop policy if exists op_orgs on orgs;
drop policy if exists op_self on operators;
drop policy if exists op_catalogues on catalogues;
drop policy if exists op_titles on titles;
drop policy if exists op_albums on albums;
drop policy if exists op_photos on photos;
drop policy if exists op_usage on usage_rollup;
drop policy if exists op_play_events on play_events;
drop policy if exists anon_catalogues on catalogues;
drop policy if exists anon_titles on titles;
drop policy if exists anon_albums on albums;
drop policy if exists anon_photos on photos;
drop policy if exists anon_profiles_insert on profiles;
drop policy if exists anon_progress on playback_progress;
drop policy if exists anon_module_state on module_state;
drop policy if exists anon_play_events_insert on play_events;

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
--
-- **The anon role has no policies at all, deliberately.**
--
-- A guest's browser never speaks to Postgres. Every guest path — rendering a catalogue, saving
-- a resume position, recording a play — goes through a Next route that reads and writes with
-- the service-role key, server-side. The schema was written expecting direct client access that
-- was never built, so every anon grant here was a capability no code exercised.
--
-- That mattered, because the anon key is `NEXT_PUBLIC_` and printed into every page. The read
-- grants let anyone lift it and enumerate every published catalogue on the platform with the
-- couple's name and wedding date — a public directory doc 01 forbids twice. `playback_progress`
-- was `using (true)`, readable by anyone, defended on the grounds that it holds no names; true
-- today, and one column away from being false.
--
-- If a client-side path is ever wanted, the answer is a signed per-guest token minted by the
-- server for one catalogue — not a blanket grant on a table, and not a tighter predicate on one.


-- ── Belt and braces ────────────────────────────────────────────────────────────
-- RLS is the boundary, but a role with no policy *and* no grant is unreachable twice over.
-- The service role bypasses RLS by design and is unaffected by this.
revoke all on catalogues, titles, albums, photos, profiles, playback_progress,
              module_state, play_events, usage_rollup, orgs, operators
       from anon;
