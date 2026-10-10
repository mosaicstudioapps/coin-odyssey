-- Give the recognizer's condition notes a field of their own.
--
-- Until 1.1, a scan wrote its condition observation ("Light wear on high
-- points...") into `notes`, the field the coin screen labels as the
-- collector's own notes. That put the model's words in the collector's mouth,
-- and it made anything that counts real notes (the Notetaker achievement)
-- unlock by itself.
--
-- From 1.1 on, scans write here and `notes` is the collector's alone. Rows
-- scanned earlier are left as they are: there is no reliable way to tell which
-- of their notes the collector wrote or edited.

alter table public.coins
  add column if not exists condition_notes text;

comment on column public.coins.condition_notes is
  'Condition observation from the scan recognizer. The collector''s own notes live in notes.';
