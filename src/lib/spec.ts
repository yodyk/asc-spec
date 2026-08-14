// ============================================================================
// Pure spec helpers + types — ported verbatim from the approved prototype so
// the real app derives categories, requirements, groups and change badges
// exactly the way the design was signed off. No data access here.
// ============================================================================

export type Event = {
  name: string;
  parent_event: string | null;
  type: string | null;
  description: string | null;
  change_status: string | null;
};

export type Parameter = {
  name: string;
  value_type: string | null;
  formatting: string | null;
  fallback_value: string | null;
  is_mapped: boolean;
  definition: string | null;
  example: string | null;
};

export type EventParameter = {
  parameter: string;
  required: string | null;
  example: string | null;
  value_type: string | null;
  formatting: string | null;
  fallback: string | null;
  mapped_list_raw: string | null;
  display_order: number | null;
  change_status: string | null;
  mapped: string[];
};

// ── category (Engagement vs Conversion, + derivative) ───────────────────────
export type Category = "Engagement" | "Conversion";

export function categoryOf(e: Pick<Event, "type" | "name">): {
  category: Category;
  derivative: boolean;
} {
  const t = (e.type || "").toLowerCase();
  const derivative = t.includes("derivative");
  let category: Category | null = t.includes("conversion")
    ? "Conversion"
    : t.includes("engagement")
      ? "Engagement"
      : null;
  if (!category) {
    category = /submission|_sale|sale$|purchase|sold|submit/.test(e.name)
      ? "Conversion"
      : "Engagement";
  }
  return { category, derivative };
}

// ── change kind (NEW vs UPDATED) ────────────────────────────────────────────
export type ChangeKind = "NEW" | "UPDATED" | null;

export function changeKind(raw: string | null | undefined): ChangeKind {
  if (!raw) return null;
  const t = raw.toUpperCase();
  if (t === "NEW") return "NEW";
  return "UPDATED"; // CHANGE / UPDATED / anything else
}

/** Text for a change badge, e.g. "New · Spec 1.2". */
export function changeLabel(kind: ChangeKind, specVersion: string): string | null {
  if (!kind) return null;
  return `${kind === "NEW" ? "New" : "Updated"} · Spec ${specVersion}`;
}

// ── requirement (Always / Conditional / Optional) ───────────────────────────
export type Requirement = { cls: "always" | "cond" | "opt"; label: string; condition: string };

export function requirementOf(required: string | null | undefined): Requirement {
  if (!required) return { cls: "opt", label: "Optional", condition: "" };
  const r = required.toLowerCase().trim();
  if (r === "yes" || r === "required") return { cls: "always", label: "Always", condition: "" };
  if (r === "no" || r === "optional") return { cls: "opt", label: "Optional", condition: "" };
  return { cls: "cond", label: "Conditional", condition: required };
}

// ── event families (sidebar groups + "Browse by group") ─────────────────────
export const GROUPS: { name: string; test: (name: string) => boolean }[] = [
  { name: "Page views", test: (n) => /pageview/.test(n) },
  { name: "Forms", test: (n) => /form/.test(n) },
  { name: "Voice & calls", test: (n) => /voice|click_to_call/.test(n) },
  { name: "Chat & messaging", test: (n) => /comm/.test(n) },
  { name: "Video", test: (n) => /video/.test(n) },
  { name: "Interactions", test: (n) => /cta|menu|element|media|special_offer|retail/.test(n) },
  { name: "System", test: (n) => /system/.test(n) },
];

export function groupOf(name: string): string {
  for (const g of GROUPS) if (g.test(name)) return g.name;
  return "Other";
}

/** Split a pipe-delimited mapped-values cell into a clean list. */
export function parseMapped(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}
