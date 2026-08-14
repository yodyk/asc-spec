// Builds the "Example dataLayer payload" for an event — real example values
// where the spec provides them, ‹placeholders› otherwise.
export type PayloadParam = {
  name: string;
  example: string | null;
  mapped: string[];
  valueType: string | null;
};

export function samplePayload(eventName: string, params: PayloadParam[]) {
  const rows: [string, string][] = [["event", JSON.stringify(eventName)]];
  for (const p of params) {
    let v: string;
    if (p.example) v = JSON.stringify(p.example);
    else if (p.mapped.length) v = JSON.stringify(p.mapped[0]);
    else if (/int|number/i.test(p.valueType || "")) v = "0";
    else v = `"‹${p.name}›"`;
    rows.push([p.name, v]);
  }
  const text =
    "window.dataLayer.push({\n" +
    rows.map(([k, v]) => `  "${k}": ${v}`).join(",\n") +
    "\n});";
  return { text, rows };
}
