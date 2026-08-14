"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { ChangeBadge } from "./ui";
import type { EventParam } from "@/lib/queries";

const GROUPS = [
  { cls: "always", label: "Required", color: "var(--pos)" },
  { cls: "cond", label: "Conditional", color: "var(--warn)" },
  { cls: "opt", label: "Optional", color: "var(--faint)" },
] as const;

export function EventParamsTable({ params }: { eventName?: string; params: EventParam[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (n: string) =>
    setOpen((s) => {
      const x = new Set(s);
      x.has(n) ? x.delete(n) : x.add(n);
      return x;
    });

  return (
    <div className="tablewrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Allowed values</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.flatMap((g) => {
            const arr = params.filter((p) => p.requirement === g.cls);
            if (!arr.length) return [];
            const rows: React.ReactNode[] = [
              <tr key={`h-${g.cls}`} className="grouprow">
                <td colSpan={5}>
                  <span className="gh">
                    <span className="gdot" style={{ background: g.color }} />
                    {g.label}
                    <span className="gcount">{arr.length}</span>
                  </span>
                </td>
              </tr>,
            ];
            arr.forEach((p) => {
              const isOpen = open.has(p.name);
              rows.push(
                <tr
                  key={`r-${p.name}`}
                  className={`prow ${isOpen ? "open" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(p.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(p.name);
                    }
                  }}
                >
                  <td>
                    <span className="pname">{p.name}</span>
                    {p.requirement === "cond" && p.required && <div className="condtext">{p.required}</div>}
                  </td>
                  <td>{p.valueType ? <span className="pill type">{p.valueType}</span> : <span className="muted">—</span>}</td>
                  <td>{p.mapped.length ? <span className="valcount">{p.mapped.length} values</span> : <span className="muted">free text</span>}</td>
                  <td className="c-status">
                    <ChangeBadge change={p.change} />
                  </td>
                  <td className="c-go">
                    <Icon name="chevR" size={16} />
                  </td>
                </tr>
              );
              if (isOpen) {
                rows.push(
                  <tr key={`d-${p.name}`} className="pdet">
                    <td colSpan={5}>
                      <div className="pdpanel">
                        {p.definition ? (
                          <div className="pddef">{p.definition}</div>
                        ) : (
                          <div className="pddef p2note">Description coming soon.</div>
                        )}
                        <div className="pmeta">
                          <div>
                            <span className="mk">Value type</span>
                            <span className="mv">{p.valueType || "—"}</span>
                          </div>
                          <div>
                            <span className="mk">Formatting</span>
                            <span className="mv">{p.formatting || "—"}</span>
                          </div>
                          <div>
                            <span className="mk">Fallback</span>
                            <span className="mv">{p.fallback || "—"}</span>
                          </div>
                          <div>
                            <span className="mk">Example</span>
                            <span className="mv">{p.example || "—"}</span>
                          </div>
                        </div>
                        {p.mapped.length > 0 && (
                          <div className="pdvals">
                            <div className="lbl">Allowed values · {p.mapped.length}</div>
                            <div className="vals">
                              {p.mapped.map((v) => (
                                <span className="val" key={v}>
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <Link href={`/parameters/${encodeURIComponent(p.name)}`} className="openlink">
                          Open parameter <Icon name="chevR" size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }
            });
            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
