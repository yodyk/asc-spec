"use client";
import { useState } from "react";
import { Icon } from "./icons";
import type { DataLayerParam } from "@/lib/queries";

// The base data-layer parameters as a flat, expandable list. Unlike an event's
// parameter table these aren't graded Required/Conditional/Optional — they're
// the shared fields that ride along on every event — so there are no groups.
export function DataLayerTable({ params }: { params: DataLayerParam[] }) {
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => {
            const isOpen = open.has(p.name);
            return (
              <FragmentRow key={p.name} p={p} isOpen={isOpen} toggle={() => toggle(p.name)} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ p, isOpen, toggle }: { p: DataLayerParam; isOpen: boolean; toggle: () => void }) {
  return (
    <>
      <tr
        className={`prow ${isOpen ? "open" : ""}`}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <td>
          <span className="pname">{p.name}</span>
        </td>
        <td>{p.kind ? <span className="pill type">{p.kind}</span> : <span className="muted">—</span>}</td>
        <td>
          {p.mapped.length ? (
            <span className="valcount">{p.mapped.length} values</span>
          ) : (
            <span className="muted">free text</span>
          )}
        </td>
        <td className="c-go">
          <Icon name="chevR" size={16} />
        </td>
      </tr>
      {isOpen && (
        <tr className="pdet">
          <td colSpan={4}>
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
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
