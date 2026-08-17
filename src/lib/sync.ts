// ============================================================================
// The sync: Google Sheet  →  raw_rows (mirror)  →  derived tables (promote)  →
// change_log. Reads the per-event `asc_*` tabs plus Event_List (descriptions)
// and Parameter_List (definitions/examples) so the app matches the prototype.
//
// Design notes:
//  - Promotion is name-keyed upserts; anything not seen this run is soft-deleted
//    (is_active = false) so favorites/links and history survive removals.
//  - The change feed is built from the sheet's own NEW/CHANGE markers for the
//    current spec version (plus removals detected this run). A hash is stored on
//    every row so a future version can add pure "diff vs. yesterday" detection.
//  - NOTHING here throws on a bad row: unparseable/duplicate rows are flagged to
//    needs_review, never fatal.
//
//  ⚠ Authored without Node available to run it — this is the most likely place
//    to need a little local debugging (column matching, exact tab names).
// ============================================================================
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin, SPEC_VERSION } from "./supabase";
import { listTabs, getCsvGrid, findHeaderRow, findCol, cell } from "./sheets";
import { changeKind, groupOf, parseMapped } from "./spec";

// Tabs that are NOT per-event definitions.
const SKIP_TABS = new Set(["asc_datalayer", "asc_list", "asc_tester"]);

type PParam = {
  name: string;
  required: string;
  example: string;
  definition: string;
  value_type: string;
  formatting: string;
  fallback: string;
  type: string;
  mapped: string[];
  change: "NEW" | "CHANGE" | "";
};
type PEvent = {
  name: string;
  type: string;
  description: string;
  change: "NEW" | "UPDATED" | "";
  params: PParam[];
};

const hash = (obj: unknown) =>
  createHash("sha1").update(JSON.stringify(obj)).digest("hex");

// ── 1. read + parse the sheet ───────────────────────────────────────────────
export async function readSpec(): Promise<PEvent[]> {
  const tabs = await listTabs(); // name → gid
  const gidFor = (name: string) => tabs.get(name);
  const eventTabs = [...tabs.keys()].filter((t) => t.startsWith("asc_") && !SKIP_TABS.has(t));

  // Event_List → per-event { type, description, change }.
  // Fixed columns (merged cells offset the values): A=change B=name E=type F=description.
  const evMeta = new Map<string, { type: string; description: string; change: string }>();
  const elGid = gidFor("Event_List");
  if (elGid) {
    const g = await getCsvGrid(elGid);
    const h = findHeaderRow(g, "event name");
    for (const row of g.slice(h + 1)) {
      const name = cell(row, 1);
      if (name.startsWith("asc_")) {
        evMeta.set(name, { type: cell(row, 4), description: cell(row, 5), change: cell(row, 0) });
      }
    }
  }

  // Parameter_List → master { definition, example, value_type } for backfill.
  const paramDict = new Map<string, { definition: string; example: string; value_type: string }>();
  const plGid = gidFor("Parameter_List");
  if (plGid) {
    const g = await getCsvGrid(plGid);
    const h = findHeaderRow(g, "parameter name");
    const head = g[h] || [];
    const cPN = findCol(head, "parameter name");
    const cPD = findCol(head, "parameter definition", "definition");
    const cPE = findCol(head, "example");
    const cPV = findCol(head, "value type");
    for (const row of g.slice(h + 1)) {
      const nm = cell(row, cPN);
      if (nm && !paramDict.has(nm)) {
        paramDict.set(nm, { definition: cell(row, cPD), example: cell(row, cPE), value_type: cell(row, cPV) });
      }
    }
  }

  // Per-event tabs.
  const events: PEvent[] = [];
  for (const tab of eventTabs) {
    const g = await getCsvGrid(gidFor(tab)!);
    const h = findHeaderRow(g, "parameters"); // "PARAMETERS" (plural) — avoids the nav row's "Parameter List"
    if (h < 0) continue;
    const head = g[h];
    const cP = findCol(head, "parameters");
    const cReq = findCol(head, "required");
    const cEx = findCol(head, "example");
    const cDef = findCol(head, "definition");
    const cVT = findCol(head, "value type");
    const cFmt = findCol(head, "formatting");
    const cFb = findCol(head, "fallback");
    const cTy = findCol(head, "type");
    const cMap = findCol(head, "mapped value list");

    const params: PParam[] = [];
    for (const row of g.slice(h + 1)) {
      const name = cell(row, cP);
      if (!name) continue;
      const dict = paramDict.get(name);
      const chRaw = cell(row, 2).toUpperCase(); // col C holds NEW / Change (header blank)
      params.push({
        name,
        required: cell(row, cReq),
        example: cell(row, cEx) || dict?.example || "",
        definition: cell(row, cDef) || dict?.definition || "",
        value_type: cell(row, cVT) || dict?.value_type || "",
        formatting: cell(row, cFmt),
        fallback: cell(row, cFb),
        type: cell(row, cTy),
        mapped: parseMapped(cell(row, cMap)),
        change: chRaw === "NEW" ? "NEW" : chRaw.includes("CHANG") ? "CHANGE" : "",
      });
    }

    const meta = evMeta.get(tab) || { type: "", description: "", change: "" };
    const t = (meta.type || "").toLowerCase();
    let evChange: PEvent["change"] = "";
    if (meta.change.toUpperCase() === "NEW" || t.includes("new event")) evChange = "NEW";
    else if (meta.change.toLowerCase().includes("chang") || t.includes("add parameter") || params.some((p) => p.change))
      evChange = "UPDATED";

    events.push({ name: tab, type: meta.type, description: meta.description, change: evChange, params });
  }

  return events;
}

// ── 1b. read the non-event content tabs ─────────────────────────────────────
// The canonical mapped-value catalog, per-value definitions, the data layer,
// requirements, and the FAQ — everything that isn't a per-event table.
type MapInfo = { values: string[]; note: string };
type DLParam = {
  name: string;
  kind: string;
  example: string;
  definition: string;
  value_type: string;
  formatting: string;
  fallback: string;
  mapped_list_raw: string;
};
export type Extras = {
  mappings: Map<string, MapInfo>; // param → authoritative values + v1.1 note
  valueDefs: Map<string, { definition: string; isNew: boolean }>; // `${param}::${value}`
  datalayer: DLParam[];
  datalayerNotes: string[];
  requirements: { number: number | null; text: string; change_status: string | null }[];
  guidelines: { question: string; answer: string }[];
};

export async function readExtras(): Promise<Extras> {
  const tabs = await listTabs();
  const gidFor = (n: string) => tabs.get(n);

  // Parameter_Mappings — the complete, authoritative mapped-value catalog.
  // Column E holds the full pipe-delimited list; column H (v1.1 NOTES) holds a
  // per-parameter note ("NEW Values", "Definition Changed", …).
  const mappings = new Map<string, MapInfo>();
  const pmGid = gidFor("Parameter_Mappings");
  if (pmGid) {
    const g = await getCsvGrid(pmGid);
    const h = findHeaderRow(g, "parameter name");
    if (h >= 0) {
      for (const row of g.slice(h + 1)) {
        const name = cell(row, 1);
        if (!name) continue;
        let values = parseMapped(cell(row, 4));
        if (!values.length) values = row.slice(8).map((c) => (c || "").trim()).filter(Boolean);
        if (!values.length) continue;
        mappings.set(name, { values, note: cell(row, 7) });
      }
    }
  }

  // Mapped Parameter_Guidelines — per-value definitions. The parameter name is
  // a merged cell (blank on continuation rows), so forward-fill it.
  const valueDefs = new Map<string, { definition: string; isNew: boolean }>();
  const mgGid = gidFor("Mapped Parameter_Guidelines");
  if (mgGid) {
    const g = await getCsvGrid(mgGid);
    const h = findHeaderRow(g, "parameter name");
    if (h >= 0) {
      let cur = "";
      for (const row of g.slice(h + 1)) {
        const p = cell(row, 1);
        if (p) cur = p;
        const val = cell(row, 2);
        if (!cur || !val) continue;
        valueDefs.set(`${cur}::${val}`, {
          definition: cell(row, 5),
          isNew: cell(row, 0).toUpperCase().includes("NEW"),
        });
      }
    }
  }

  // asc_datalayer — base parameters (event-tab layout, fixed columns) plus a
  // trailing description blob we keep as a page-level note.
  const datalayer: DLParam[] = [];
  const datalayerNotes: string[] = [];
  const dlGid = gidFor("asc_datalayer");
  if (dlGid) {
    const g = await getCsvGrid(dlGid);
    const h = g.findIndex((r) => (r[1] || "").trim().toLowerCase() === "parameter");
    if (h >= 0) {
      for (const row of g.slice(h + 1)) {
        const name = cell(row, 1);
        if (!name) continue;
        if (/\s/.test(name)) {
          datalayerNotes.push(name); // trailing prose, not a parameter
          continue;
        }
        datalayer.push({
          name,
          kind: cell(row, 16),
          example: cell(row, 3),
          definition: cell(row, 6),
          value_type: cell(row, 12),
          formatting: cell(row, 13),
          fallback: cell(row, 14),
          mapped_list_raw: cell(row, 17),
        });
      }
    }
  }

  // Requirements/Definitions — numbered requirements + the parameter
  // priority-order list that trails requirement #8.
  const requirements: Extras["requirements"] = [];
  const priority: string[] = [];
  const rqGid = gidFor("Requirements/Definitions");
  if (rqGid) {
    const g = await getCsvGrid(rqGid);
    for (const row of g) {
      const n = parseFloat(cell(row, 0));
      const text = cell(row, 2);
      if (Number.isFinite(n) && text) {
        requirements.push({ number: n, text, change_status: /new/i.test(cell(row, 1)) ? "NEW" : null });
      }
      const pr = cell(row, 3);
      if (pr) priority.push(pr);
    }
    if (priority.length && requirements.length) {
      const target = requirements.find((r) => /priority order/i.test(r.text)) || requirements[requirements.length - 1];
      target.text += `\n\nParameter priority order (lowest priority first): ${priority.join(", ")}`;
    }
  }

  // General_Guidelines — the FAQ (col B question, col C answer).
  const guidelines: Extras["guidelines"] = [];
  const ggGid = gidFor("General_Guidelines");
  if (ggGid) {
    const g = await getCsvGrid(ggGid);
    for (const row of g) {
      const q = cell(row, 1);
      const a = cell(row, 2);
      if (!q || !a) continue;
      if (/^faq$/i.test(q) || /ga4 standard/i.test(q)) continue;
      guidelines.push({ question: q, answer: a });
    }
  }

  return { mappings, valueDefs, datalayer, datalayerNotes, requirements, guidelines };
}

// ── 2. mirror to raw_rows ───────────────────────────────────────────────────
async function mirrorRaw(admin: SupabaseClient, events: PEvent[]) {
  const rows = events.flatMap((e, ei) =>
    e.params.map((p, pi) => ({
      source_tab: e.name,
      event: e.name,
      parameter: p.name,
      required: p.required,
      value_type: p.value_type,
      formatting: p.formatting,
      fallback: p.fallback,
      type: p.type,
      mapped_list: p.mapped.join("|"),
      example: p.example,
      definition: p.definition,
      description: e.description,
      change: p.change,
      row_index: pi,
      content_hash: hash([e.name, p]),
      extra: {},
    }))
  );
  // Full-refresh the mirror each run (it's an audit copy, keyed by content).
  await admin.from("raw_rows").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (let i = 0; i < rows.length; i += 500) {
    await admin.from("raw_rows").insert(rows.slice(i, i + 500));
  }
}

// ── 3. promote into the derived tables ──────────────────────────────────────
type PromoteResult = { seenEvents: Set<string>; seenParams: Set<string>; removed: string[] };

async function promote(admin: SupabaseClient, events: PEvent[], extras: Extras): Promise<PromoteResult> {
  // Build the parameter master (union across every event + the Parameter_List backfill).
  const pmap = new Map<string, PParam>();
  const mappedByParam = new Map<string, Set<string>>();
  for (const e of events)
    for (const p of e.params) {
      const cur = pmap.get(p.name);
      // Prefer the first instance, but fill blanks from later ones.
      if (!cur) pmap.set(p.name, { ...p });
      else {
        cur.value_type ||= p.value_type;
        cur.formatting ||= p.formatting;
        cur.fallback ||= p.fallback;
        cur.definition ||= p.definition;
        cur.example ||= p.example;
      }
      if (p.mapped.length) {
        const s = mappedByParam.get(p.name) || new Set<string>();
        p.mapped.forEach((v) => s.add(v));
        mappedByParam.set(p.name, s);
      }
    }

  // Fold in the authoritative Parameter_Mappings catalog: it is the source of
  // truth for the COMPLETE value set, and may list mapped parameters that never
  // appear on an event tab (those still deserve a parameter row + mappings).
  for (const [name, info] of extras.mappings) {
    if (!pmap.has(name)) {
      pmap.set(name, {
        name,
        required: "",
        example: "",
        definition: "",
        value_type: "",
        formatting: "",
        fallback: "",
        type: "Mapped",
        mapped: info.values,
        change: "",
      });
    }
    const s = mappedByParam.get(name) || new Set<string>();
    info.values.forEach((v) => s.add(v));
    mappedByParam.set(name, s);
  }

  // parameters
  const paramRows = [...pmap.values()].map((p) => {
    const note = extras.mappings.get(p.name)?.note || null;
    return {
      name: p.name,
      value_type: p.value_type || null,
      formatting: p.formatting || null,
      fallback_value: p.fallback || null,
      is_mapped: mappedByParam.has(p.name),
      definition: p.definition || null,
      example: p.example || null,
      mapping_note: note,
      is_active: true,
      content_hash: hash({ v: p.value_type, f: p.formatting, fb: p.fallback, d: p.definition, ex: p.example, m: mappedByParam.has(p.name), n: note }),
      updated_at: new Date().toISOString(),
    };
  });
  const { data: pIds } = await admin
    .from("parameters")
    .upsert(paramRows, { onConflict: "name" })
    .select("id,name");
  const paramId = new Map((pIds || []).map((r) => [r.name as string, r.id as string]));

  // events
  const eventRows = events.map((e) => ({
    name: e.name,
    parent_event: null,
    type: e.type || null,
    description: e.description || null,
    change_status: e.change || null,
    is_active: true,
    content_hash: hash({ t: e.type, d: e.description, c: e.change }),
    updated_at: new Date().toISOString(),
  }));
  const { data: eIds } = await admin
    .from("events")
    .upsert(eventRows, { onConflict: "name" })
    .select("id,name");
  const eventId = new Map((eIds || []).map((r) => [r.name as string, r.id as string]));

  // event_parameters
  const epRows: Record<string, unknown>[] = [];
  const seenEP = new Set<string>();
  for (const e of events) {
    const eid = eventId.get(e.name);
    if (!eid) continue;
    e.params.forEach((p, order) => {
      const pid = paramId.get(p.name);
      if (!pid) return;
      const key = `${eid}:${pid}`;
      if (seenEP.has(key)) return; // duplicate param on one event → keep first, flag below
      seenEP.add(key);
      epRows.push({
        event_id: eid,
        parameter_id: pid,
        required: p.required || null,
        example: p.example || null,
        value_type: p.value_type || null,
        formatting: p.formatting || null,
        fallback: p.fallback || null,
        mapped_list_raw: p.mapped.join("|") || null,
        display_order: order,
        change_status: p.change === "NEW" ? "NEW" : p.change ? "UPDATED" : null,
        is_active: true,
        content_hash: hash([e.name, p.name, p.required, p.value_type, p.formatting, p.fallback, p.mapped, p.change]),
      });
    });
  }
  for (let i = 0; i < epRows.length; i += 500) {
    await admin.from("event_parameters").upsert(epRows.slice(i, i + 500), { onConflict: "event_id,parameter_id" });
  }

  // mapped_values (with per-value definitions from Mapped Parameter_Guidelines)
  const mvRows: Record<string, unknown>[] = [];
  for (const [pname, vals] of mappedByParam) {
    const pid = paramId.get(pname);
    if (!pid) continue;
    for (const v of vals) {
      const gd = extras.valueDefs.get(`${pname}::${v}`);
      mvRows.push({
        parameter_id: pid,
        value: v,
        definition: gd?.definition || null,
        change_status: gd?.isNew ? "NEW" : null,
        is_active: true,
      });
    }
  }
  for (let i = 0; i < mvRows.length; i += 500) {
    await admin.from("mapped_values").upsert(mvRows.slice(i, i + 500), { onConflict: "parameter_id,value" });
  }

  // ── soft-delete anything not seen this run ────────────────────────────────
  const seenEvents = new Set(events.map((e) => e.name));
  const seenParams = new Set(pmap.keys());
  const removed = await softDeleteUnseen(admin, seenEvents, seenParams, seenEP, mappedByParam, paramId);

  return { seenEvents, seenParams, removed };
}

async function softDeleteUnseen(
  admin: SupabaseClient,
  seenEvents: Set<string>,
  seenParams: Set<string>,
  seenEP: Set<string>,
  mappedByParam: Map<string, Set<string>>,
  paramId: Map<string, string>
): Promise<string[]> {
  const removed: string[] = [];

  // events
  const { data: exEv } = await admin.from("events").select("id,name").eq("is_active", true);
  const deadEv = (exEv || []).filter((r) => !seenEvents.has(r.name as string));
  if (deadEv.length) {
    await admin.from("events").update({ is_active: false }).in("id", deadEv.map((r) => r.id));
    deadEv.forEach((r) => removed.push(`event:${r.name}`));
  }

  // parameters
  const { data: exPa } = await admin.from("parameters").select("id,name").eq("is_active", true);
  const deadPa = (exPa || []).filter((r) => !seenParams.has(r.name as string));
  if (deadPa.length) {
    await admin.from("parameters").update({ is_active: false }).in("id", deadPa.map((r) => r.id));
    deadPa.forEach((r) => removed.push(`parameter:${r.name}`));
  }

  // event_parameters (by id pair)
  const { data: exEP } = await admin.from("event_parameters").select("id,event_id,parameter_id").eq("is_active", true);
  const deadEP = (exEP || []).filter((r) => !seenEP.has(`${r.event_id}:${r.parameter_id}`));
  if (deadEP.length) {
    await admin.from("event_parameters").update({ is_active: false }).in("id", deadEP.map((r) => r.id));
  }

  // mapped_values (by param id + value)
  const seenMV = new Set<string>();
  for (const [pname, vals] of mappedByParam) {
    const pid = paramId.get(pname);
    if (pid) vals.forEach((v) => seenMV.add(`${pid}:${v}`));
  }
  const { data: exMV } = await admin.from("mapped_values").select("id,parameter_id,value").eq("is_active", true);
  const deadMV = (exMV || []).filter((r) => !seenMV.has(`${r.parameter_id}:${r.value}`));
  if (deadMV.length) {
    await admin.from("mapped_values").update({ is_active: false }).in("id", deadMV.map((r) => r.id));
  }

  return removed;
}

// ── 4. rebuild the change feed for the current spec version ─────────────────
async function rebuildChangeLog(admin: SupabaseClient, events: PEvent[], removed: string[]) {
  await admin.from("change_log").delete().eq("spec_version", SPEC_VERSION);

  const rows: Record<string, unknown>[] = [];
  for (const e of events) {
    if (e.change) {
      rows.push({
        spec_version: SPEC_VERSION,
        entity: "event",
        entity_key: e.name,
        kind: e.change === "NEW" ? "added" : "changed",
        detected_at: new Date().toISOString(),
      });
    }
    for (const p of e.params) {
      if (p.change) {
        rows.push({
          spec_version: SPEC_VERSION,
          entity: "parameter",
          entity_key: `${e.name}::${p.name}`,
          kind: changeKind(p.change) === "NEW" ? "added" : "changed",
          detected_at: new Date().toISOString(),
        });
      }
    }
  }
  for (const key of removed) {
    const [entity, name] = key.split(":");
    rows.push({ spec_version: SPEC_VERSION, entity, entity_key: name, kind: "removed", detected_at: new Date().toISOString() });
  }
  if (rows.length) await admin.from("change_log").insert(rows);
}

// ── 5. data layer + reference content ───────────────────────────────────────
async function writeDataLayer(admin: SupabaseClient, extras: Extras) {
  const rows: Record<string, unknown>[] = extras.datalayer.map((d, i) => ({
    name: d.name,
    kind: d.kind || null,
    example: d.example || null,
    definition: d.definition || null,
    value_type: d.value_type || null,
    formatting: d.formatting || null,
    fallback_value: d.fallback || null,
    mapped_list_raw: d.mapped_list_raw || null,
    display_order: i,
    change_status: null,
    is_active: true,
    content_hash: hash(d),
    updated_at: new Date().toISOString(),
  }));
  // Trailing description prose → page-level notes (kind='note').
  extras.datalayerNotes.forEach((text, i) =>
    rows.push({
      name: `__note_${i}`,
      kind: "note",
      example: null,
      definition: text,
      value_type: null,
      formatting: null,
      fallback_value: null,
      mapped_list_raw: null,
      display_order: 1000 + i,
      change_status: null,
      is_active: true,
      content_hash: hash(text),
      updated_at: new Date().toISOString(),
    })
  );
  if (rows.length) await admin.from("datalayer_parameters").upsert(rows, { onConflict: "name" });

  const seen = new Set(rows.map((r) => r.name as string));
  const { data: ex } = await admin.from("datalayer_parameters").select("id,name").eq("is_active", true);
  const dead = (ex || []).filter((r) => !seen.has(r.name as string));
  if (dead.length)
    await admin.from("datalayer_parameters").update({ is_active: false }).in("id", dead.map((r) => r.id));
}

async function writeContent(admin: SupabaseClient, extras: Extras) {
  // Small, unkeyed reference tables — full refresh each run.
  await admin.from("requirements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (extras.requirements.length)
    await admin.from("requirements").insert(
      extras.requirements.map((r) => ({ number: r.number, text: r.text, change_status: r.change_status, is_active: true }))
    );

  await admin.from("guidelines").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (extras.guidelines.length)
    await admin.from("guidelines").insert(
      extras.guidelines.map((x, i) => ({ question: x.question, answer: x.answer, category: null, sort_order: i, is_active: true }))
    );
}

// ── orchestrator ────────────────────────────────────────────────────────────
export type SyncSummary = {
  ok: boolean;
  events: number;
  parameters: number;
  removed: number;
  error?: string;
};

export async function runSync(): Promise<SyncSummary> {
  const admin = supabaseAdmin();

  const { data: run } = await admin
    .from("sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  try {
    const events = await readSpec();
    const extras = await readExtras();
    await mirrorRaw(admin, events);
    const res = await promote(admin, events, extras);
    await writeDataLayer(admin, extras);
    await writeContent(admin, extras);

    // dedupe / anomaly flags: any event listing the same param twice.
    for (const e of events) {
      const seen = new Set<string>();
      for (const p of e.params) {
        if (seen.has(p.name)) {
          await admin.from("needs_review").insert({
            reason: "duplicate_parameter",
            detail: `${e.name} lists ${p.name} more than once (kept the first).`,
          });
        }
        seen.add(p.name);
      }
    }

    await rebuildChangeLog(admin, events, res.removed);

    const summary: SyncSummary = {
      ok: true,
      events: events.length,
      parameters: res.seenParams.size,
      removed: res.removed.length,
    };
    if (runId)
      await admin
        .from("sync_runs")
        .update({
          status: "ok",
          finished_at: new Date().toISOString(),
          rows_read: events.reduce((n, e) => n + e.params.length, 0),
          promoted: summary.events,
          notes: `events=${summary.events} params=${summary.parameters} removed=${summary.removed} datalayer=${extras.datalayer.length} requirements=${extras.requirements.length} guidelines=${extras.guidelines.length}`,
        })
        .eq("id", runId);
    return summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId)
      await admin
        .from("sync_runs")
        .update({ status: "error", finished_at: new Date().toISOString(), notes: message })
        .eq("id", runId);
    return { ok: false, events: 0, parameters: 0, removed: 0, error: message };
  }
}
