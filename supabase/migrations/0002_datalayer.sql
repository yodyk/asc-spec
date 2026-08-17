-- ============================================================================
-- 0002 — Data Layer parameters
--
-- The `asc_datalayer` tab defines the global/base parameters present on every
-- event (store_name, oem_code, page_type, items[], {key}.item_*, the
-- measurement-id array, …). It parses like an event tab but isn't an event, and
-- its {key}.-prefixed notation would pollute the global Parameters list — so it
-- lives in its own table and renders on a dedicated "Data Layer" page.
--
-- The `requirements`, `guidelines`, and `mapped_values.definition` targets used
-- by this release already exist in 0001 — no change needed there.
--
-- Run this once in the Supabase SQL editor, then re-run the sync to populate.
-- ============================================================================

create table if not exists datalayer_parameters (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,        -- e.g. store_name, {key}.item_make
  kind           text,                         -- source "TYPE": Dynamic | Mapped | Array
  example        text,
  definition     text,
  value_type     text,
  formatting     text,
  fallback_value text,
  mapped_list_raw text,                        -- pipe-delimited allowed values (if mapped)
  display_order  int,
  change_status  text,
  is_active      boolean not null default true,
  content_hash   text,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_datalayer_active on datalayer_parameters(is_active);

alter table datalayer_parameters enable row level security;

create policy "public read active datalayer"
  on datalayer_parameters for select using (is_active);

-- Per-parameter mapping note from Parameter_Mappings' "v1.1 NOTES" column
-- (e.g. "NEW Values", "Definition Changed", "Suggested Values"). Surfaced on
-- the parameter + mappings pages instead of being dropped.
alter table parameters add column if not exists mapping_note text;

-- Preserve the FAQ's authored order (the table keys on a random uuid).
alter table guidelines add column if not exists sort_order int;
