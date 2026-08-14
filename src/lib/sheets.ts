// ============================================================================
// Published-sheet reader — reads the ASC spec straight from its "publish to web"
// CSV endpoints. NO Google Cloud / service account needed. The published doc id
// is derived from SHEET_URL (lib/config.ts).
//
// This algorithm was validated against the live published sheet before shipping.
// ============================================================================
import { SHEET_URL } from "./config";

const PUB_ID = (SHEET_URL.match(/\/d\/e\/([^/]+)/) || [])[1] || "";
const PUB_BASE = `https://docs.google.com/spreadsheets/d/e/${PUB_ID}`;

type Grid = string[][];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "asc-spec-sync" } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

/** Tab name → gid, parsed from the pubhtml page's sheet list. */
export async function listTabs(): Promise<Map<string, string>> {
  if (!PUB_ID) throw new Error("Could not derive the published sheet id from SHEET_URL.");
  const html = await fetchText(`${PUB_BASE}/pubhtml`);
  const map = new Map<string, string>();
  const re = /\{name: "([^"]+)",[^}]*?gid: "(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1].replace(/\\\//g, "/").replace(/\\"/g, '"');
    if (!map.has(name)) map.set(name, m[2]);
  }
  if (map.size === 0) throw new Error("No tabs found in pubhtml — is the sheet still published to the web?");
  return map;
}

/** One tab's full contents as a 2D string array (CSV, redirects followed). */
export async function getCsvGrid(gid: string): Promise<Grid> {
  const csv = await fetchText(`${PUB_BASE}/pub?gid=${gid}&single=true&output=csv`);
  return parseCsv(csv);
}

// ── tiny robust CSV parser (handles quoted commas, "" escapes, quoted newlines) ─
function parseCsv(text: string): Grid {
  const rows: Grid = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ── parsing helpers ─────────────────────────────────────────────────────────

/** Index of the first row (within the top ~12) whose cells contain `label`. */
export function findHeaderRow(grid: Grid, label: string): number {
  const l = label.toLowerCase();
  for (let i = 0; i < Math.min(grid.length, 12); i++) {
    if (grid[i].some((c) => (c || "").trim().toLowerCase().includes(l))) return i;
  }
  return -1;
}

/** Column index of the first header cell whose text contains one of `labels`. */
export function findCol(header: string[], ...labels: string[]): number {
  const lc = header.map((h) => (h || "").trim().toLowerCase());
  for (const label of labels) {
    const i = lc.findIndex((h) => h.includes(label));
    if (i >= 0) return i;
  }
  return -1;
}

/** Safe, trimmed cell read. */
export function cell(row: string[], col: number): string {
  if (col < 0 || col >= row.length) return "";
  return (row[col] || "").trim();
}
