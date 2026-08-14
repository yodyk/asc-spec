# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js + Supabase (Postgres), confirmed by the user for this greenfield build. Supabase carries the derived spec tables and the nightly sync/diff logic (cron + edge function or scheduled job); Next.js serves the public read-only explorer. Deploy target not yet confirmed (Vercel is the natural pairing for Next.js). Project currently rooted in this working folder.

## Users

**Primary — non-technical / mixed.** ASC members, marketing teams, dealers, and newcomers who need to consult the Automotive Standards Council spec without decoding a spreadsheet. They scan, search, and read; they are not implementing code.

**Secondary — technical implementers.** Developers and analysts who implement the GA4 dataLayer events and need exact parameter names, value types, required conditions, and allowed values. Their depth lives one level below the primary browsing experience, not at the front door.

## Product Purpose

A dynamic, always-current, searchable web version of the **ASC Spec** — the Automotive Standards Council's GA4 event / dataLayer standard for automotive websites — replacing a chaotic 33-tab Google Sheet that users tolerate but do not enjoy. Success: anyone can find and understand any event, parameter, or allowed value in seconds, and the published spec stays current automatically without anyone maintaining a second copy.

## Positioning

The spec's editing team owns a Google Sheet and will not announce changes. This product treats that sheet as the source of truth, **syncs from it automatically (nightly), and turns the sync's diff into an automatic "What's changed" changelog** — so the tool tells you what moved instead of the team having to. Two things the incumbent spreadsheet fundamentally cannot do: (1) reverse lookup — pick a parameter and see every event that uses it; (2) automatic, trustworthy change tracking. It is the spec as living documentation, not a prettier grid.

## Operating Context

- **Source of truth:** a Google Sheet (the `asc_tester` tab is the canonical, machine-readable grid), maintained by a separate editing team. The user (Joe, marketing) has edit access. Once-a-day freshness is acceptable.
- **Sync architecture (decided):** two-layer ingest — a permissive `raw_rows` mirror of the sheet that cannot reject input (loose text columns + a JSON catch-all), then a forgiving transform that promotes clean rows into derived tables (`events`, `parameters`, `event_parameters`, `mapped_values`) keyed by natural names (event name / parameter name). Unseen rows soft-delete; a content-hash diff writes a `change_log`; malformed/duplicate rows route to a `needs_review` table instead of breaking the app.
- **Spec domain:** GA4 analytics events for automotive sites — ~47 events (flat list, several with sub-variants like `asc_form_submission_parts`), 72 parameters, mapped enum values, plus requirements and guidelines. Events are grouped by family (Page views, Forms, Voice & calls, Chat & messaging, Video, Interactions, System).
- **Broader effort:** part of an ASC website redesign the user is leading.

## Capabilities and Constraints

- **v1 is structure-first.** The build ships the structural grid (events, parameters, required conditions, value types, mapped-value lists) from `asc_tester`. Human-readable definitions, examples, and the guidelines/FAQ content are **Phase 2** (they live in other, less-canonical tabs and layer on without rework).
- **Free-text `required` conditions are kept verbatim** (e.g. `"If page_type = item"`) and always displayed; any structured parsing is a later nicety, never load-bearing.
- **No user accounts and no favorites.** Removed by decision in favor of an open, public, read-only tool. Personalization state does not exist in the product.
- **Resilience is a hard requirement:** nothing the editing team types into the sheet may break the app; bad data becomes visible (`needs_review`), never fatal.
- **Change tracking:** in v1 the "what changed" feed comes entirely from the sync diff (the canonical tab carries no curated NEW/CHANGE labels); the team's curated labels can join in Phase 2.
- **Explicitly undecided:** deploy target; whether the source code itself is open-sourced and under what license; the Phase-2 definitions source (enrich from the per-event/`Parameter_List` tabs vs. fattening `asc_tester`); whether `asc_tester` is truly team-maintained (treated as canonical for now).

## Brand Commitments

Existing Automotive Standards Council (ASC) brand; the app is styled as "Spec Explorer." Binding constraints the user set (recorded as-is, not expanded):

- **Logos:** `ASCApp_2026-Icon-Black.svg` (angular "A" mark) and `ASCApp_2026-WordmarkIcon-Black.svg`, both at `/Users/joe/Dropbox/PCG Digital/Automotive Standards Council/01 | Branding/`. Single-color (`#000`) art, recolored via CSS.
- **Typeface:** TASA Orbiter (variable), file at `/Volumes/KNAGGS/Download 2026-2027/TASA_Orbiter/TASAOrbiter-VariableFont_wght.ttf`.
- **Palette:** black/yellow/orange — black `#231F20`, orange `#FF7100` (and a slightly deeper `#F26400` for text/link contrast), gold/amber `#FAAB00`, pale yellow `#FFEB87`. **Recovered from older brand files; not yet confirmed against the 2026 rebrand.** Brand color is to be used sparingly on a neutral base — explicitly not a cream/tan-heavy interface.
- **Radii:** minimal — 6px maximum, ~4px typical.
- **Weight:** no true bold anywhere; semibold (600) is the ceiling.

## Evidence on Hand

- **Real spec data:** workbook `ASC v1.2.xlsx` at `/Volumes/KNAGGS/Download 2026-2027/` — extracted to `asc-data.json` (23 richly-populated events, 496 event×parameter rows, all 72 parameter names). This is genuine content, not placeholder.
- **Brand assets:** the two logo SVGs and the TASA Orbiter font (paths above).
- **Working prototype:** an interactive HTML explorer built this session (sidebar-grouped navigation, drill-down tables, search, mappings, auto-changelog view) with the real data embedded.
- **Absences future work must not fabricate:** no confirmed 2026 brand hex values (current ones are recovered from old files); no plain-language definitions yet (Phase 2); no testimonials, adoption metrics, or member counts.

## Product Principles

1. **The sheet stays the source of truth.** The app mirrors it and must never require the editing team to change how they work.
2. **Resilient over strict.** Ingest tolerates anything; bad or messy data is surfaced for review, never allowed to break the experience.
3. **Make the invisible visible.** Automatically surface what changed in the spec, because no one will tell you.
4. **Non-technical first, depth one click deeper.** The front door is plain and scannable; exact values and edge cases live below it for implementers.
5. **Open and public.** No accounts, no gatekeeping — the spec belongs to everyone who uses it.
