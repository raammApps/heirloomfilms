-- ═══════════════════════════════════════════════════════════════════════════════
-- Revoke anonymous reads (doc 15 §0)
--
-- `0002` granted `select` to `anon` on catalogues, titles, albums and photos so a browser
-- could read published content directly. **No code ever did.** Guest pages and the admin both
-- read through `SupabaseRepository`, which holds the service-role key and runs server-side.
--
-- The grant was therefore a capability nothing exercised — and the anon key is `NEXT_PUBLIC_`,
-- printed into every page this app serves. Anyone could lift it from the source and list every
-- published catalogue on the platform, with the couple's name and wedding date:
--
--     aanya-and-vikram    Aanya & Vikram   2026-12-01
--     swarit-and-smriti   Swarit & Smriti  2026-08-03
--
-- Doc 01 forbids exactly this, twice: "No public directory, search, or cross-catalogue browse
-- exists anywhere in the product", and a catalogue is "never findable by anyone without the
-- link". A per-row policy cannot fix it, because the leak is the *enumeration*, not any single
-- row — a guest with a link never needed to list anything.
--
-- Today it exposes two couples. Once partners share this database it exposes every partner's
-- entire client list to anyone, competitors included.
--
-- The insert policy on `profiles` stays: a guest genuinely does create a profile, and it is
-- write-only to them. Should any client-side read be wanted later, it should go through a
-- server route that already knows which catalogue the guest is looking at — not through a
-- blanket grant on the table.
-- ═══════════════════════════════════════════════════════════════════════════════

drop policy if exists anon_catalogues on catalogues;
drop policy if exists anon_titles on titles;
drop policy if exists anon_albums on albums;
drop policy if exists anon_photos on photos;

-- Belt and braces: RLS is the boundary, but a table with no policy for a role and no grant is
-- unreachable twice over. The service role bypasses RLS by design and is unaffected.
revoke select on catalogues, titles, albums, photos from anon;
