-- ============================================================================
-- ASC Spec Explorer — schema
--
-- Two layers:
--   1. raw_rows      : permissive 1:1 mirror of the source sheet. Nothing is
--                      rejected here — bad/blank/duplicate cells land intact.
--   2. derived tables: clean, name-keyed model the app reads. Populated by a
--                      forgiving transform; rows it can't promote go to
--                      needs_review instead of breaking anything.
--
-- Everything the public app reads keys on human-readable names (event.name,
-- parameter.name), so a reshuffle of the source never breaks favorites/links.
-- The public site reads the derived tables + change_log via the anon key (RLS
-- allows SELECT of active rows only). The sync writes with the service role,
-- which bypasses RLS.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ── LAYER 1 : permissive raw mirror ─────────────────────────────────────────
create table if not exists raw_rows (
  id           uuid primary key default gen_random_uuid(),
  source_tab   text,                         -- which sheet tab this row came from
  event        text,
  parameter    text,
  required      text,                         -- free text, verbatim ("If page_type = item")
  value_type   text,
  formatting   text,
  fallback     text,
  type         text,                          -- 'Dynamic' | 'Mapped' | anything
  mapped_list  text,                          -- pipe-delimited allowed values
  example      text,
  definition   text,
  description  text,
  change       text,                          -- 'NEW' | 'CHANGE' | null
  extra        jsonb not null default '{}',   -- any column the sheet grows later
  row_index    int,
  content_hash text,
  synced_at    timestamptz not null default now()
);

-- ── LAYER 2 : derived tables the app reads ──────────────────────────────────
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,         -- stable key, e.g. asc_form_submission
  parent_event  text,                         -- nullable family link (asc_form_submission_parts → parent)
  type          text,                         -- raw category text from the source; app derives Engagement/Conversion
  description   text,
  is_optional   boolean not null default false,
  change_status text,                         -- 'NEW' | 'UPDATED' | null
  is_active     boolean not null default true,
  content_hash  text,
  updated_at    timestamptz not null default now()
);

create table if not exists parameters (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,        -- stable key, e.g. page_type
  value_type     text,
  formatting     text,
  fallback_value text,
  is_mapped      boolean not null default false,
  is_recommended boolean not null default false,
  matches_google boolean not null default false,
  definition     text,
  example        text,
  is_active      boolean not null default true,
  content_hash   text,
  updated_at     timestamptz not null default now()
);

create table if not exists event_parameters (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  parameter_id    uuid not null references parameters(id) on delete cascade,
  required        text,                        -- free text kept verbatim
  example         text,
  value_type      text,
  formatting      text,
  fallback        text,
  mapped_list_raw text,
  display_order   int,
  change_status   text,
  is_active       boolean not null default true,
  content_hash    text,
  unique (event_id, parameter_id)             -- stable composite key
);

create table if not exists mapped_values (
  id            uuid primary key default gen_random_uuid(),
  parameter_id  uuid not null references parameters(id) on delete cascade,
  value         text not null,
  definition    text,
  change_status text,
  is_active     boolean not null default true,
  unique (parameter_id, value)
);

create table if not exists requirements (
  id            uuid primary key default gen_random_uuid(),
  number        numeric,
  text          text,
  change_status text,
  is_active     boolean not null default true
);

create table if not exists guidelines (
  id        uuid primary key default gen_random_uuid(),
  question  text,
  answer    text,
  category  text,
  is_active boolean not null default true
);

-- ── change feed (powers "What's changed") ───────────────────────────────────
create table if not exists change_log (
  id           uuid primary key default gen_random_uuid(),
  spec_version text,
  entity       text,                           -- 'event' | 'parameter' | 'event_parameter' | 'mapped_value'
  entity_key   text,                           -- human key, e.g. "asc_pageview" or "asc_pageview::page_type"
  field        text,
  old_value    text,
  new_value    text,
  kind         text,                           -- 'added' | 'changed' | 'removed'
  detected_at  timestamptz not null default now()
);

-- ── operational (internal only, never exposed to the public) ────────────────
create table if not exists needs_review (
  id          uuid primary key default gen_random_uuid(),
  raw_row_id  uuid references raw_rows(id) on delete set null,
  reason      text,
  detail      text,
  flagged_at  timestamptz not null default now()
);

create table if not exists sync_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running', -- 'running' | 'ok' | 'error'
  rows_read   int,
  promoted    int,
  flagged     int,
  notes       text
);

-- ── indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_event_parameters_event on event_parameters(event_id);
create index if not exists idx_event_parameters_param on event_parameters(parameter_id);
create index if not exists idx_mapped_values_param on mapped_values(parameter_id);
create index if not exists idx_change_log_detected on change_log(detected_at desc);
create index if not exists idx_events_active on events(is_active);
create index if not exists idx_parameters_active on parameters(is_active);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Public site uses the anon key. It may SELECT active rows of the derived
-- tables + the change_log. It gets NO access to raw_rows / needs_review /
-- sync_runs. The sync uses the service role, which bypasses RLS entirely.

alter table events            enable row level security;
alter table parameters        enable row level security;
alter table event_parameters  enable row level security;
alter table mapped_values     enable row level security;
alter table requirements      enable row level security;
alter table guidelines        enable row level security;
alter table change_log        enable row level security;
alter table raw_rows          enable row level security;
alter table needs_review      enable row level security;
alter table sync_runs         enable row level security;

create policy "public read active events"          on events           for select using (is_active);
create policy "public read active parameters"      on parameters       for select using (is_active);
create policy "public read active event_params"    on event_parameters for select using (is_active);
create policy "public read active mapped_values"   on mapped_values    for select using (is_active);
create policy "public read active requirements"    on requirements     for select using (is_active);
create policy "public read active guidelines"      on guidelines       for select using (is_active);
create policy "public read change_log"             on change_log       for select using (true);
-- raw_rows / needs_review / sync_runs: no policies → no anon access (service role only).
