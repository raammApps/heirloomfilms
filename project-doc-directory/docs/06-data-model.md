# 06 — Data Model

Postgres from Phase 0 — the admin console needs it. There is no config-file phase.

## 1. Schema

```sql
-- ── Tenancy ────────────────────────────────────────────────────────────────
create table orgs (                      -- a wedding management company
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  branding    jsonb not null default '{}',   -- default logo/colours inherited by catalogues
  created_at  timestamptz not null default now()
);

create table operators (                 -- people who log into admin
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references orgs(id) on delete cascade,
  name       text not null,
  role       text not null default 'admin' check (role in ('admin','uploader')),
  created_at timestamptz not null default now()
);

-- ── The wedding ────────────────────────────────────────────────────────────
create table catalogues (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  slug          text unique not null,         -- subdomain label
  custom_domain text unique,

  couple_name   jsonb not null,               -- {en:"Aanya & Vikram", hi:"…"}
  app_name      jsonb not null,               -- {en:"AanyaVikramStream"} — see docs/12 §1
  wedding_date  date not null,
  city          jsonb,
  synopsis      jsonb,                        -- the billboard blurb

  branding      jsonb not null default '{}',  -- overrides org branding
  featured_title_id uuid,                     -- hero billboard

  status        text not null default 'draft'
                check (status in ('draft','published','archived')),
  privacy       text not null default 'unlisted'
                check (privacy in ('unlisted','passcode')),
  passcode_hash text,

  -- subscription
  included_until timestamptz not null,        -- created_at + 3 months
  sub_status    text not null default 'included'
                check (sub_status in ('included','active','grace','lapsed','cold','deleted')),
  sub_plan      text check (sub_plan in ('monthly','yearly')),
  sub_until     timestamptz,

  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

-- ── Content ────────────────────────────────────────────────────────────────
create table titles (
  id            uuid primary key default gen_random_uuid(),
  catalogue_id  uuid not null references catalogues(id) on delete cascade,

  name          jsonb not null,               -- {en:"The Sangeet", hi:"संगीत"}
  synopsis      jsonb,
  category      text not null,                -- see §2
  credits       jsonb default '[]',           -- [{role:"Cinematography", name:"…"}]

  provider      text not null default 'bunny',
  provider_id   text,                         -- Bunny video GUID
  duration_s    int,
  poster_url    text,
  poster_source text default 'auto' check (poster_source in ('auto','custom','generated')),
  thumbnails_url text,                        -- sprite/vtt for scrub preview
  captions      jsonb default '[]',           -- [{lang:"hi", url:"…"}]

  status        text not null default 'uploading'
                check (status in ('uploading','processing','ready','failed')),
  error_message text,

  published     boolean not null default false,
  sort_order    int not null default 0,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),

  -- denormalised counters, updated by job
  view_count       int not null default 0,
  view_count_7d    int not null default 0,
  watch_seconds    bigint not null default 0
);

create index on titles (catalogue_id, published, category, sort_order);
create index on titles (catalogue_id, view_count_7d desc);
create index on titles (catalogue_id, published_at desc);

-- ── Viewers ────────────────────────────────────────────────────────────────
-- Guests never authenticate. A "profile" is a local identity, created on the
-- profile gate and stored client-side; the server only ever sees its opaque id.
create table profiles (
  id           uuid primary key default gen_random_uuid(),
  catalogue_id uuid not null references catalogues(id) on delete cascade,
  label        text not null,                 -- "Bride's side" — NOT a person's name
  avatar_seed  text not null,
  created_at   timestamptz not null default now()
);

create table playback_progress (
  profile_id   uuid not null references profiles(id) on delete cascade,
  title_id     uuid not null references titles(id) on delete cascade,
  position_s   int  not null default 0,
  duration_s   int  not null,
  completed    boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (profile_id, title_id)
);

create table my_list (
  profile_id uuid not null references profiles(id) on delete cascade,
  title_id   uuid not null references titles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (profile_id, title_id)
);

-- ── Ops ────────────────────────────────────────────────────────────────────
create table play_events (               -- append-only, feeds trending + analytics
  id           bigserial primary key,
  catalogue_id uuid not null references catalogues(id) on delete cascade,
  title_id     uuid not null references titles(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete set null,
  seconds      int not null,             -- watched in this heartbeat window
  at           timestamptz not null default now()
);
create index on play_events (catalogue_id, at desc);

create table usage_rollup (              -- cost monitoring, per catalogue per month
  catalogue_id uuid not null references catalogues(id) on delete cascade,
  month        date not null,
  stored_gb    numeric(10,3) not null default 0,
  delivered_gb numeric(10,3) not null default 0,
  primary key (catalogue_id, month)
);
```

## 2. Categories

Categories **label** a title (shown in the detail modal, used for the poster fallback style).
They no longer *generate* rows — at 8–12 titles, auto-grouping by category produces six rows
of one card each, which looks broken. **Rows are curated by hand in the customizer**, with
operator-written titles. See doc 14 §3 `curated_row`.

Fixed vocabulary — operators pick, they do not invent. Free text produces twelve spellings of
"Sangeet" in one catalogue.

| Key | Row label (EN) | Row label (HI) |
|---|---|---|
| `highlights` | Highlights | झलकियाँ |
| `pre_wedding` | Pre-Wedding | प्री-वेडिंग |
| `mehendi` | Mehendi | मेहंदी |
| `haldi` | Haldi | हल्दी |
| `sangeet` | Sangeet | संगीत |
| `ceremony` | The Ceremony | विवाह |
| `reception` | Reception | रिसेप्शन |
| `full_films` | Full Films | पूरी फ़िल्में |
| `aerial` | From Above | ड्रोन |
| `guest_wishes` | Messages & Wishes | शुभकामनाएँ |
| `behind_scenes` | Behind the Scenes | पर्दे के पीछे |

Adding a category is a migration plus a translation, deliberately.

## 3. Rows

**Rows are curated, not computed.** A catalogue of eight items has no useful statistics; a
"Trending" row across eight titles ranks the billboard first every time, and "New This Week"
lists the entire catalogue because it all published at once. Both are **cut** — see doc 01
§5.1 VE-13/14.

| Row | Definition |
|---|---|
| **Curated row** | An ordered list of `title_ids` chosen by the operator, with an operator-written heading. The default. |
| **Continue Watching** (P1) | `playback_progress` for this profile where `position_s > 30` and not `completed`. Genuinely useful only for the one long film — most items are under 5 minutes and get finished. |

`view_count` and `watch_seconds` are still recorded, but they feed **operator analytics**
("the highlights film was watched 240 times"), not guest-facing ranking. A play counts past 30
seconds watched; counting impressions would make the analytics a vanity number.

## 4. Row Level Security

```sql
alter table catalogues enable row level security;
alter table titles     enable row level security;
alter table profiles   enable row level security;
alter table playback_progress enable row level security;

-- Operators: only their org's catalogues
create policy op_catalogues on catalogues for all to authenticated
  using  (org_id = (select org_id from operators where id = auth.uid()))
  with check (org_id = (select org_id from operators where id = auth.uid()));

-- Guests (anon): read only published titles of a published catalogue.
create policy anon_titles on titles for select to anon
  using (published and exists (
    select 1 from catalogues c
    where c.id = titles.catalogue_id
      and c.status = 'published'
      and c.sub_status in ('included','active','grace')
  ));

-- Guests write only their own progress. No select policy on other profiles.
create policy anon_progress on playback_progress for all to anon
  using (true) with check (true);   -- scoped by opaque profile_id; see note
```

> **Note on `playback_progress`.** A permissive anon policy is acceptable only because
> `profile_id` is an unguessable UUID held client-side and the table contains no personal
> data — a label like "Bride's side", a title id, and a number of seconds. Do not add a
> guest name or phone to this table; the moment you do, this policy becomes a leak. If
> per-guest identity is ever needed, move to signed guest tokens first.

## 5. Modelling decisions

**Profiles are labels, not people.** "Bride's side", not "Rhea Menon". This keeps the entire
viewer side of the product free of personal data, which removes almost all DPDP surface from
the highest-traffic path. It costs nothing: Continue Watching works just as well keyed to a
device-local profile.

**`play_events` is append-only and coarse.** Heartbeats every 10 seconds, aggregated nightly.
Do not build a per-guest viewing history — it is a privacy liability, and no planner has
asked "who watched what", only "how much was watched".

**Subscription state lives on the catalogue, not a separate billing table in Phase 0/1.**
Five states cover the whole lifecycle. A billing table arrives when there is a second plan
shape to model.

**`provider` and `provider_id` on titles, not a hardcoded Bunny column.** The provider
abstraction in `lib/video/provider.ts` is the point; the schema should not undo it.

**Denormalised counters on `titles`.** They exist for the operator's analytics view, not for
guest-facing ranking. Keep them because they are cheap and because "your highlights film was
watched 240 times" is the line that sells a renewal to a couple.

**A `titles` table, not a media library.** There is no folder tree, no tagging system, no bulk
metadata editor. Eight to fifteen rows per catalogue, hand-ordered. Any feature that assumes
hundreds of items is a signal the product has drifted.

## 6. Lifecycle

| Stage | Action |
|---|---|
| Catalogue created | `status=draft`, `included_until = now() + 3 months` |
| Titles uploaded | `titles.status` moves uploading → processing → ready via webhook |
| Published | `status=published`, `published_at` set, ISR revalidated |
| Month 3 | Upsell surfaced in-catalogue and emailed; `sub_status` → `active` on payment |
| Payment fails / no renewal | `sub_status=grace` for 60 days — renewal screen, content retained |
| Grace ends | `sub_status=cold`, assets moved to cold storage, restorable in 24h |
| +12 months cold | Final email notice, then `deleted` |
| Any time | Operator can export a manifest of source files and metadata |

The cold-storage and deletion jobs ship in the same ticket as the states they act on. A
lifecycle documented but not implemented is a promise you are visibly breaking — and here the
thing being broken is somebody's wedding video.
