// Small presentational pieces shared across pages. Pure (no hooks), so they can
// be used from server or client components. Classes match globals.css / prototype.
import { SPEC_VERSION } from "@/lib/supabase";
import type { Category, ChangeKind } from "@/lib/spec";
import { Icon } from "./icons";

export function CategoryTag({ category, derivative }: { category: Category; derivative: boolean }) {
  const fam = category === "Conversion" ? "conv" : "eng";
  return (
    <span className={`ctag ${fam}${derivative ? " deriv" : ""}`}>
      {derivative ? "Derivative " : ""}
      {category}
    </span>
  );
}

export function ChangeBadge({ change }: { change: ChangeKind }) {
  if (!change) return null;
  const isNew = change === "NEW";
  return (
    <span className={`mini ${isNew ? "new" : "upd"}`}>
      {isNew ? "New" : "Updated"} · Spec {SPEC_VERSION}
    </span>
  );
}

export function TypePill({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  return <span className="pill type">{value}</span>;
}

export function ValueChips({ values }: { values: string[] }) {
  return (
    <div className="vals">
      {values.map((v) => (
        <span className="val" key={v}>
          {v}
        </span>
      ))}
    </div>
  );
}

/** Right-hand chevron cell used at the end of clickable table rows. */
export function ChevCell() {
  return (
    <td className="c-go">
      <Icon name="chevR" size={16} />
    </td>
  );
}
