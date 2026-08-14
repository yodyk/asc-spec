# ASC Spec Explorer

A public, always-current web version of the **Automotive Standards Council (ASC)** spec —
searchable, browsable, with a changelog — built on **Next.js + Supabase** and kept in
sync with the source Google Sheet.

> **Just want it live?** Follow [`GO-LIVE.md`](GO-LIVE.md) — ~30 minutes, entirely in the browser
> (Supabase + `supabase/seed.sql` for instant real data, then GitHub + Vercel). No local Node
> required; the daily Google-Sheet sync is an optional fast-follow.

> **Status:** full scaffold — schema, sync, and the complete UI (all pages, ported from the
> approved prototype) are in place. Authored on a machine **without Node installed**, so it
> has **not been compiled or run** here. First run locally: `npm install && npm run dev`,
> then `npm run typecheck` to surface any type nits, and iterate.

---

## Architecture

Two layers, so nothing the editing team types can break the public site:

```
 Google Sheet (source of truth)
        │   nightly, read-only
        ▼
 ┌──────────────┐   copy 1:1, reject nothing
 │  raw_rows    │   permissive mirror (all text + JSON catch-all)
 └──────┬───────┘
        │   forgiving transform (bad rows → needs_review, never fatal)
        ▼
 ┌───────────────────────────────────────────────┐   diff vs. previous → change_log
 │ events · parameters · event_parameters ·       │
 │ mapped_values · requirements · guidelines      │   ← the public site reads these
 └───────────────────────────────────────────────┘
```

- Everything keys on **human-readable names** (`event.name`, `parameter.name`), so a reshuffle
  of the sheet never breaks links.
- The public app reads the **derived tables + `change_log`** through the Supabase **anon key**;
  Row Level Security only exposes *active* rows. `raw_rows` / `needs_review` / `sync_runs` are
  never exposed.
- The sync writes with the **service role key** (server-only, bypasses RLS).

### Project layout

```
supabase/migrations/0001_init.sql   the schema above (+ RLS)
src/lib/supabase.ts                 anon client (reads) + admin client (sync)
src/lib/spec.ts                     pure helpers: category, requirement, groups, change badges
src/lib/sheets.ts                   Google Sheets reader
src/lib/sync.ts                     transform + upsert + diff
src/lib/queries.ts                  read-only data access for the pages
src/app/api/sync/route.ts           cron endpoint (secret-protected)
src/app/**                          all pages, ported from the prototype
src/components/**                   shell (Sidebar/TopBar/Chrome), tables, icons, brand
src/app/globals.css                 design system, verbatim from the prototype
public/fonts/                       TASA Orbiter (self-hosted @font-face)
```

---

## Setup

### 1. Prerequisites
- Node.js 18.18+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- A Google Cloud service account with the **Google Sheets API** enabled

### 2. Install
```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
```

### 3. Database
Run the migration against your Supabase project — either paste
`supabase/migrations/0001_init.sql` into the Supabase SQL editor, or use the CLI:
```bash
supabase db push        # if using the Supabase CLI + linked project
```

### 4. Google Sheets access (service account)
1. In Google Cloud: create a project → enable **Google Sheets API** → create a **service
   account** → add a **JSON key**.
2. Copy the service account's email and share the **ASC spec Google Sheet** with it
   (Viewer is enough).
3. Put the email + private key into `.env.local` (`GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) and the sheet ID into `GOOGLE_SHEETS_ID`.

### 5. Environment
See `.env.example` for the full list. The essentials:

| Variable | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public read access |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; used by the sync to write |
| `GOOGLE_SHEETS_ID` | the source spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | sheet read auth |
| `SYNC_SECRET` | bearer token the cron must send to `/api/sync` |
| `NEXT_PUBLIC_SPEC_VERSION` | shown in the UI + stamped on change_log rows |

### 6. Run
```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
```

---

## The daily sync (Phase 2)

- Exposed as `POST /api/sync`, protected by `Authorization: Bearer $SYNC_SECRET`.
- On **Vercel**, a once-a-day Cron Job hits it (see `vercel.json`). Vercel Cron's daily
  cadence matches the "once-a-day is plenty" requirement exactly.
- Locally you can run it with `npm run sync:local`.

It reads the sheet, mirrors rows into `raw_rows`, promotes clean rows into the derived tables
(name-keyed upserts + soft-delete of anything not seen this run), routes malformed/duplicate
rows to `needs_review`, and writes a `change_log` entry per detected change.

---

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel.
2. Add every variable from `.env.local` to the Vercel project (Production + Preview).
3. `vercel.json` registers the daily cron. Done.

---

## Notes / open decisions

- **Sync source richness** is the one open call (see the conversation): pull only the
  structural grid from the single canonical tab, or also read the per-event tabs for
  descriptions / examples / definitions so the app matches the prototype's depth. The schema
  supports both — the derived columns are nullable and a richer sync simply fills more of them.
- Definitions/examples that aren't present yet render as **"Description coming soon."** in the UI.
