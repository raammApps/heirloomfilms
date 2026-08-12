-- ═══════════════════════════════════════════════════════════════════════════════
-- Partners, platform admins, and where a catalogue came from (doc 15 §1)
--
-- Re-runnable, like 0002: migrations here are pasted into the SQL editor by hand, because
-- PostgREST executes no DDL, and a file that only works on a virgin database is one nobody
-- dares re-apply.
--
-- The shape deliberately adds **no new isolation mechanism**. `org_id` scoping already exists,
-- is enforced twice — RLS, and `requireOwnedCatalogue` taking the org from the session rather
-- than the request — and is the only thing here that has been tested against a second org.
-- Partners are orgs. Couples will be orgs. Nothing learns a new way to ask "may I see this".
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── What kind of org this is ───────────────────────────────────────────────────
-- A partner sells weddings; a couple owns one. They differ in what they may do, never in how
-- they are isolated. `partner` is the default because every org that exists today is one.
alter table orgs add column if not exists kind text not null default 'partner';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orgs_kind_check') then
    alter table orgs add constraint orgs_kind_check check (kind in ('partner', 'couple'));
  end if;
end
$$;

-- ── The platform owner ─────────────────────────────────────────────────────────
-- Deliberately **not** an org, and deliberately not a role on `operators`.
--
-- A platform admin who belonged to an org would need that org to mean "all of them", and the
-- moment "admin" is a membership, every org-scoped query has to ask whether this particular
-- member is special. That branch is where cross-tenant leaks live. A separate table means the
-- existing queries keep returning exactly one org's rows, and platform-wide views are written
-- deliberately, one at a time, rather than falling out of a predicate nobody re-read.
create table if not exists platform_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- No policy at all: this table is read through the service role, server-side, and nothing
-- client-side has any business enumerating who runs the platform.

-- ── Where a catalogue came from ────────────────────────────────────────────────
-- Survives the handover. After a catalogue moves to the couple's own org, this is what still
-- says which partner built it — for attribution, reporting and support — without leaving the
-- partner a live claim on a wedding they no longer own (doc 15 §2).
alter table catalogues add column if not exists origin_org_id uuid references orgs(id);

-- Backfill: every catalogue that exists today was created by the org that still owns it.
update catalogues set origin_org_id = org_id where origin_org_id is null;

-- ── Indexes for the lookups this adds ──────────────────────────────────────────
create index if not exists orgs_kind_idx on orgs (kind);
create index if not exists catalogues_origin_org_idx on catalogues (origin_org_id);
