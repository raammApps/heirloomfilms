-- ═══════════════════════════════════════════════════════════════════════════════
-- Handing a catalogue to the couple who own it (doc 15 §2)
--
-- Re-runnable, like 0002 and 0004.
--
-- The couple end up in control: they can add films, renew, buy storage, and remove the partner's
-- access to their own wedding. `catalogues.origin_org_id` (0004) still records who built it, so
-- attribution and support survive an ownership change that is otherwise total.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists transfers (
  id            uuid primary key default gen_random_uuid(),
  catalogue_id  uuid not null references catalogues(id) on delete cascade,
  from_org_id   uuid not null references orgs(id) on delete cascade,

  -- Who the partner says they are handing it to. Shown on the claim screen so a couple can tell
  -- they were sent the right link, and used to pre-fill the account — never to authorise, since
  -- holding the link is what authorises.
  to_email      text not null,

  /**
   * The token is stored hashed, like a password.
   *
   * It is a bearer credential that travels through WhatsApp and sits in a URL bar. A leaked
   * database should not hand somebody a working claim on every wedding in flight.
   */
  token_hash    text not null,

  expires_at    timestamptz not null,
  claimed_at    timestamptz,
  -- The org created for the couple. Set on claim, so a second click can recognise its own work.
  claimed_org_id uuid references orgs(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- One live transfer per catalogue: two outstanding links for the same wedding is a way to hand
-- it to the wrong household. Superseding is explicit — the partner cancels, then re-issues.
create unique index if not exists transfers_one_live_per_catalogue
  on transfers (catalogue_id) where claimed_at is null;

create index if not exists transfers_token_idx on transfers (token_hash);

alter table transfers enable row level security;
-- No policies: read and written through the service role, server-side. A claim is checked by a
-- route that already knows which token was presented, and the anon role has no business
-- listing weddings that are mid-handover.
