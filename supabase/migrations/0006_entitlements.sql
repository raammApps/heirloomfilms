-- Entitlements (doc 15 §3).
--
-- `MAX_TITLES` and `MAX_PHOTOS` were constants in lib/schema.ts. The moment a partner buys space
-- or a couple upgrades after the handover, a constant is the wrong shape.
--
-- Nothing writes these rows yet — that is N-20, the billing webhook. This exists first so the
-- resolution order is settled and enforced before money is involved, rather than being invented
-- in a hurry inside a payment callback.
--
-- Re-runnable: drops before creates, like 0002.

-- ── plans ────────────────────────────────────────────────────────────────────
-- A catalogue for a couple, or a bundle of credits for a partner. Two kinds because the two
-- purchases are genuinely different: a partner buys capacity in advance, a couple buys an
-- extension after the included months.
create table if not exists plans (
  id                text primary key,
  kind              text not null check (kind in ('partner', 'catalogue')),
  name              text not null,
  price_paise       integer not null default 0,
  catalogue_credits integer,
  storage_gb        integer,
  max_titles        integer,
  max_photos        integer,
  retention_months  integer,
  created_at        timestamptz not null default now()
);

-- ── entitlements ─────────────────────────────────────────────────────────────
-- A grant attached to exactly one of an org or a catalogue. Null columns mean "inherit", which
-- is what lets a grant raise storage without silently resetting the title cap.
create table if not exists entitlements (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references orgs (id) on delete cascade,
  catalogue_id  uuid references catalogues (id) on delete cascade,
  plan_id       text references plans (id),
  max_titles    integer check (max_titles is null or max_titles > 0),
  max_photos    integer check (max_photos is null or max_photos > 0),
  storage_gb    integer check (storage_gb is null or storage_gb > 0),
  -- Expired rather than deleted, so a lapse leaves a history rather than a hole.
  valid_until   timestamptz,
  created_at    timestamptz not null default now(),

  -- Exactly one subject. An entitlement attached to both would make the resolution order
  -- meaningless, and one attached to neither can never be found.
  constraint entitlements_one_subject check (
    (org_id is not null and catalogue_id is null)
    or (org_id is null and catalogue_id is not null)
  )
);

create index if not exists entitlements_org_idx on entitlements (org_id) where org_id is not null;
create index if not exists entitlements_catalogue_idx
  on entitlements (catalogue_id) where catalogue_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Same posture as every other table since 0002: the anon role gets nothing. Every read here goes
-- through a route handler holding the service-role key, and the anon key is NEXT_PUBLIC_ —
-- printed into every page.
alter table plans enable row level security;
alter table entitlements enable row level security;

drop policy if exists plans_no_anon on plans;
drop policy if exists entitlements_no_anon on entitlements;
