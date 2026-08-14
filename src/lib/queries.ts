// ============================================================================
// Read-only data access for the public site. Server-only (uses the anon client;
// RLS already limits results to active rows). Everything is shaped with the
// pure helpers in spec.ts so it matches the approved prototype exactly.
// ============================================================================
import { supabase, SPEC_VERSION } from "./supabase";
import {
  categoryOf,
  changeKind,
  requirementOf,
  groupOf,
  parseMapped,
  type Category,
  type ChangeKind,
} from "./spec";

/* eslint-disable @typescript-eslint/no-explicit-any */

export { SPEC_VERSION };

// ── Events list ─────────────────────────────────────────────────────────────
export type EventListItem = {
  name: string;
  category: Category;
  derivative: boolean;
  change: ChangeKind;
  description: string | null;
  paramCount: number;
  requiredCount: number;
  group: string;
};

export async function getEventList(): Promise<EventListItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select("name,type,description,change_status, event_parameters(required)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((e: any) => {
    const { category, derivative } = categoryOf({ name: e.name, type: e.type });
    const eps: any[] = e.event_parameters ?? [];
    return {
      name: e.name,
      category,
      derivative,
      change: changeKind(e.change_status),
      description: e.description,
      paramCount: eps.length,
      requiredCount: eps.filter((p) => requirementOf(p.required).cls === "always").length,
      group: groupOf(e.name),
    };
  });
}

// ── Event detail ────────────────────────────────────────────────────────────
export type EventParam = {
  name: string;
  required: string | null;
  requirement: "always" | "cond" | "opt";
  valueType: string | null;
  formatting: string | null;
  fallback: string | null;
  example: string | null;
  definition: string | null;
  mapped: string[];
  change: ChangeKind;
};
export type EventDetail = {
  name: string;
  category: Category;
  derivative: boolean;
  change: ChangeKind;
  description: string | null;
  group: string;
  params: EventParam[];
  counts: { total: number; required: number; conditional: number; mapped: number };
};

export async function getEvent(name: string): Promise<EventDetail | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "name,type,description,change_status, event_parameters(required,example,value_type,formatting,fallback,mapped_list_raw,display_order,change_status, parameters(name,definition))"
    )
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const eps: any[] = (data.event_parameters ?? []).sort(
    (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  const params: EventParam[] = eps.map((ep) => ({
    name: ep.parameters?.name ?? "",
    required: ep.required,
    requirement: requirementOf(ep.required).cls,
    valueType: ep.value_type,
    formatting: ep.formatting,
    fallback: ep.fallback,
    example: ep.example,
    definition: ep.parameters?.definition ?? null,
    mapped: parseMapped(ep.mapped_list_raw),
    change: changeKind(ep.change_status),
  }));
  const { category, derivative } = categoryOf({ name: data.name, type: (data as any).type });
  return {
    name: data.name,
    category,
    derivative,
    change: changeKind(data.change_status),
    description: data.description,
    group: groupOf(data.name),
    params,
    counts: {
      total: params.length,
      required: params.filter((p) => p.requirement === "always").length,
      conditional: params.filter((p) => p.requirement === "cond").length,
      mapped: params.filter((p) => p.mapped.length > 0).length,
    },
  };
}

// ── Parameters list ─────────────────────────────────────────────────────────
export type ParamListItem = {
  name: string;
  valueType: string | null;
  definition: string | null;
  usedOn: number;
  mappedCount: number;
};

export async function getParameterList(): Promise<ParamListItem[]> {
  const { data, error } = await supabase
    .from("parameters")
    .select("name,value_type,definition,is_mapped, event_parameters(event_id), mapped_values(value)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    name: p.name,
    valueType: p.value_type,
    definition: p.definition,
    usedOn: (p.event_parameters ?? []).length,
    mappedCount: p.is_mapped ? (p.mapped_values ?? []).length : 0,
  }));
}

// ── Parameter detail ────────────────────────────────────────────────────────
export type ParamUsage = {
  event: string;
  category: Category;
  derivative: boolean;
  change: ChangeKind;
  requirement: "always" | "cond" | "opt";
  example: string | null;
};
export type ParamDetail = {
  name: string;
  valueType: string | null;
  formatting: string | null;
  fallback: string | null;
  isMapped: boolean;
  definition: string | null;
  example: string | null;
  mapped: string[];
  usage: ParamUsage[];
};

export async function getParameter(name: string): Promise<ParamDetail | null> {
  const { data, error } = await supabase
    .from("parameters")
    .select(
      "name,value_type,formatting,fallback_value,is_mapped,definition,example, mapped_values(value), event_parameters(required,example,value_type,formatting,fallback, events(name,type,change_status))"
    )
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const usage: ParamUsage[] = (data.event_parameters ?? [])
    .filter((ep: any) => ep.events)
    .map((ep: any) => {
      const { category, derivative } = categoryOf({ name: ep.events.name, type: ep.events.type });
      return {
        event: ep.events.name,
        category,
        derivative,
        change: changeKind(ep.events.change_status),
        requirement: requirementOf(ep.required).cls,
        example: ep.example,
      };
    })
    .sort((a: ParamUsage, b: ParamUsage) => a.event.localeCompare(b.event));

  return {
    name: data.name,
    valueType: data.value_type,
    formatting: data.formatting,
    fallback: data.fallback_value,
    isMapped: data.is_mapped,
    definition: data.definition,
    example: data.example,
    mapped: (data.mapped_values ?? []).map((m: any) => m.value).sort(),
    usage,
  };
}

// ── Mappings ────────────────────────────────────────────────────────────────
export type Mapping = { name: string; values: string[]; usedOn: number };

export async function getMappings(): Promise<Mapping[]> {
  const { data, error } = await supabase
    .from("parameters")
    .select("name, mapped_values(value), event_parameters(event_id)")
    .eq("is_mapped", true)
    .order("name");
  if (error) throw error;
  return (data ?? [])
    .map((p: any) => ({
      name: p.name,
      values: (p.mapped_values ?? []).map((m: any) => m.value).sort(),
      usedOn: (p.event_parameters ?? []).length,
    }))
    .filter((m: Mapping) => m.values.length > 0);
}

// ── Changes ─────────────────────────────────────────────────────────────────
export type ChangeItem = {
  kind: "added" | "changed" | "removed";
  entity: "event" | "parameter";
  name: string;
  onEvent: string | null;
};

export async function getChanges(): Promise<{ items: ChangeItem[]; newCount: number; updatedCount: number }> {
  const { data, error } = await supabase
    .from("change_log")
    .select("entity,entity_key,kind")
    .eq("spec_version", SPEC_VERSION)
    .order("detected_at", { ascending: false });
  if (error) throw error;
  const items: ChangeItem[] = (data ?? []).map((r: any) => {
    const isParam = r.entity === "parameter";
    const [ev, pm] = isParam ? String(r.entity_key).split("::") : [r.entity_key, null];
    return {
      kind: r.kind,
      entity: isParam ? "parameter" : "event",
      name: isParam ? pm ?? r.entity_key : r.entity_key,
      onEvent: isParam ? ev : null,
    };
  });
  return {
    items,
    newCount: items.filter((i) => i.kind === "added").length,
    updatedCount: items.filter((i) => i.kind === "changed").length,
  };
}

// ── Search ──────────────────────────────────────────────────────────────────
export type SearchResults = {
  events: { name: string; category: Category; derivative: boolean; paramCount: number }[];
  params: { name: string; usedOn: number }[];
};

export async function search(q: string): Promise<SearchResults> {
  const like = `%${q}%`;
  // Separate .ilike() queries (robust escaping) then merge unique by name.
  const [evName, evDesc, paName, paDef] = await Promise.all([
    supabase.from("events").select("name,type, event_parameters(event_id)").ilike("name", like).limit(60),
    supabase.from("events").select("name,type, event_parameters(event_id)").ilike("description", like).limit(60),
    supabase.from("parameters").select("name, event_parameters(event_id)").ilike("name", like).limit(60),
    supabase.from("parameters").select("name, event_parameters(event_id)").ilike("definition", like).limit(60),
  ]);

  const eventsByName = new Map<string, any>();
  for (const e of [...(evName.data ?? []), ...(evDesc.data ?? [])]) eventsByName.set(e.name, e);
  const paramsByName = new Map<string, any>();
  for (const p of [...(paName.data ?? []), ...(paDef.data ?? [])]) paramsByName.set(p.name, p);

  return {
    events: [...eventsByName.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e: any) => {
        const { category, derivative } = categoryOf({ name: e.name, type: e.type });
        return { name: e.name, category, derivative, paramCount: (e.event_parameters ?? []).length };
      }),
    params: [...paramsByName.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p: any) => ({ name: p.name, usedOn: (p.event_parameters ?? []).length })),
  };
}

// ── Sidebar data (nav tree + counts) ────────────────────────────────────────
export type NavEvent = { name: string; category: Category; group: string };
export async function getSidebarData(): Promise<{
  navEvents: NavEvent[];
  counts: { events: number; parameters: number; mappings: number; changed: number };
}> {
  const events = await getEventList();
  const [pAll, pMapped] = await Promise.all([
    supabase.from("parameters").select("*", { count: "exact", head: true }),
    supabase.from("parameters").select("*", { count: "exact", head: true }).eq("is_mapped", true),
  ]);
  return {
    navEvents: events.map((e) => ({ name: e.name, category: e.category, group: e.group })),
    counts: {
      events: events.length,
      parameters: pAll.count ?? 0,
      mappings: pMapped.count ?? 0,
      changed: events.filter((e) => e.change).length,
    },
  };
}

// ── Overview aggregate ──────────────────────────────────────────────────────
export async function getOverview() {
  const [events, params, mappings, changes] = await Promise.all([
    getEventList(),
    getParameterList(),
    getMappings(),
    getChanges(),
  ]);
  const groups = new Map<string, number>();
  for (const e of events) groups.set(e.group, (groups.get(e.group) ?? 0) + 1);
  const changed = events.filter((e) => e.change);
  return {
    counts: { events: events.length, parameters: params.length, mappings: mappings.length, changed: changed.length },
    groups: [...groups.entries()].map(([name, count]) => ({ name, count })),
    recent: changed.slice(0, 5),
  };
}
