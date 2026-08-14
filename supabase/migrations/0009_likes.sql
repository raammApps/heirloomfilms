-- Likes on films and photographs, counted across guests and shown to everyone (N-31).
--
-- Keyed on a device-local `guest_key` rather than on `profiles.id`. A profile is optional — the
-- gate can be skipped, and most guests do skip it — so keying on it would mean either creating a
-- profile behind their back on first tap, or silently refusing the tap. Both are worse than a
-- key the browser holds, and neither is more trustworthy: a profile id is a client-held string
-- too. This is a wedding gallery, not a ballot.
--
-- `subject_id` is deliberately untyped by foreign key: it names a title *or* a photo, and one
-- column cannot reference two tables. The cascade that matters is the catalogue's, which is here.
create table if not exists likes (
  catalogue_id uuid not null references catalogues(id) on delete cascade,
  guest_key    text not null,
  subject_type text not null check (subject_type in ('title', 'photo')),
  subject_id   uuid not null,
  created_at   timestamptz not null default now(),
  primary key (catalogue_id, guest_key, subject_type, subject_id)
);

-- The read is always "every count for this catalogue", because the guest page renders them all
-- at once; the subject columns follow so the aggregate is covered by the index.
create index if not exists likes_catalogue_subject_idx
  on likes (catalogue_id, subject_type, subject_id);
