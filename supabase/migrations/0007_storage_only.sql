-- N-28 — storage becomes the only limit, and the term becomes twelve months.
--
-- Films and photographs now record what they occupy, because the plans sell gigabytes
-- (docs/PRICING.md) and a count cap refused content a customer had paid to store. A real Indian
-- wedding is every function from both sides; fifteen films is reached long before 40 GB is.
--
-- Re-runnable.

alter table titles add column if not exists size_bytes bigint;
alter table photos add column if not exists size_bytes bigint;

comment on column titles.size_bytes is
  'Bytes at the provider — the encoding ladder, not the uploaded file. Seeded from the declared '
  'size at upload and corrected by the webhook once encoding finishes.';

comment on column photos.size_bytes is
  'Bytes across every rendition. One photograph is stored at three widths.';

-- Summing storage per catalogue happens on the upload path, so it is worth an index.
create index if not exists titles_catalogue_size_idx on titles (catalogue_id) include (size_bytes);
create index if not exists photos_album_size_idx     on photos (album_id)     include (size_bytes);

-- max_titles / max_photos stay on `entitlements`. They hold grants written before storage became
-- the only limit; dropping them would discard history, and nothing reads them any more.
comment on column entitlements.max_titles is
  'Superseded by storage_gb (N-28). Retained for history; not resolved into limits.';
comment on column entitlements.max_photos is
  'Superseded by storage_gb (N-28). Retained for history; not resolved into limits.';
