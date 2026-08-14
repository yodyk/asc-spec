// ============================================================================
// Google Sheets reader (read-only, service account). The sheet is the source
// of truth; this module only ever reads it.
// ============================================================================
import { google, sheets_v4 } from "googleapis";

type Grid = string[][];

function jwt() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Support both the \n-escaped one-liner and a real multi-line PEM.
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

let _client: sheets_v4.Sheets | null = null;
async function client(): Promise<sheets_v4.Sheets> {
  if (_client) return _client;
  const auth = jwt();
  await auth.authorize();
  _client = google.sheets({ version: "v4", auth });
  return _client;
}

/** All tab titles in the spreadsheet. */
export async function listTabTitles(spreadsheetId: string): Promise<string[]> {
  const sheets = await client();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  return (res.data.sheets || [])
    .map((s) => s.properties?.title || "")
    .filter(Boolean);
}

/** One A1 range as a 2D array of strings (blank cells become ""). */
export async function getGrid(spreadsheetId: string, range: string): Promise<Grid> {
  const sheets = await client();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  return normalize(res.data.values as unknown[][] | undefined);
}

/** Several ranges at once, returned keyed by range string. */
export async function batchGet(
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, Grid>> {
  const sheets = await client();
  const out: Record<string, Grid> = {};
  // Sheets API caps batch size; chunk to be safe.
  for (let i = 0; i < ranges.length; i += 100) {
    const chunk = ranges.slice(i, i + 100);
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: chunk,
    });
    (res.data.valueRanges || []).forEach((vr, j) => {
      out[chunk[j]] = normalize(vr.values as unknown[][] | undefined);
    });
  }
  return out;
}

function normalize(values: unknown[][] | undefined): Grid {
  return (values || []).map((row) =>
    (row || []).map((c) => (c == null ? "" : String(c)))
  );
}

// ── small parsing helpers shared by the sync ────────────────────────────────

/** Column index of the first header cell whose text contains one of `labels`. */
export function findCol(header: string[], ...labels: string[]): number {
  const lc = header.map((h) => (h || "").trim().toLowerCase());
  for (const label of labels) {
    const i = lc.findIndex((h) => h.includes(label));
    if (i >= 0) return i;
  }
  return -1;
}

/** Safe cell read: returns trimmed string or "". */
export function cell(row: string[], col: number): string {
  if (col < 0 || col >= row.length) return "";
  return (row[col] || "").trim();
}
