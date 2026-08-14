import { notFound } from "next/navigation";
import { getParameter } from "@/lib/queries";
import { CopyButton } from "@/components/CopyButton";
import { CategoryTag, ChangeBadge, ChevCell } from "@/components/ui";
import { ClickRow } from "@/components/ClickRow";
import { Icon } from "@/components/icons";

const GROUPS = [
  { cls: "always", label: "Required on", color: "var(--pos)" },
  { cls: "cond", label: "Conditional on", color: "var(--warn)" },
  { cls: "opt", label: "Optional on", color: "var(--faint)" },
] as const;

export default async function ParameterDetailPage({ params }: { params: { param: string } }) {
  const name = decodeURIComponent(params.param);
  const p = await getParameter(name);
  if (!p) notFound();

  return (
    <>
      <div className="dhead">
        <div className="titlerow">
          <h1 className="ptitle mono">{p.name}</h1>
          <CopyButton text={p.name} className="copybtn" ariaLabel="Copy parameter name" />
        </div>
        <div className="dtags">
          <span className="pill type">{p.valueType || "parameter"}</span>
          {p.isMapped ? (
            <span className="ctag conv">Mapped · {p.mapped.length} values</span>
          ) : (
            <span className="ctag eng">Dynamic · free text</span>
          )}
          <span className="ctag eng">
            Used on {p.usage.length} event{p.usage.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <p className="ddesc">{p.definition ? p.definition : <span className="p2note">Description coming soon.</span>}</p>

      <div className="sectlabel">At a glance</div>
      <div className="metagrid">
        <div className="m">
          <div className="mk">Value type</div>
          <div className="mv">{p.valueType || "—"}</div>
        </div>
        <div className="m">
          <div className="mk">Formatting</div>
          <div className="mv">{p.formatting || "—"}</div>
        </div>
        <div className="m">
          <div className="mk">Fallback value</div>
          <div className="mv">{p.fallback || "—"}</div>
        </div>
        <div className="m">
          <div className="mk">Example</div>
          <div className="mv">{p.example || "—"}</div>
        </div>
      </div>

      {p.mapped.length > 0 && (
        <>
          <div className="sectlabel">Allowed values · {p.mapped.length}</div>
          <div className="callout">
            <span className="i">
              <Icon name="info" size={18} />
            </span>
            <div>The only accepted values this parameter can take.</div>
          </div>
          <div className="vals" style={{ marginTop: "14px" }}>
            {p.mapped.map((v) => (
              <span className="val" key={v}>
                {v}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="sectlabel">
        Used on {p.usage.length} event{p.usage.length !== 1 ? "s" : ""}
      </div>
      <div className="tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.flatMap((g) => {
              const arr = p.usage.filter((u) => u.requirement === g.cls);
              if (!arr.length) return [];
              const rows: React.ReactNode[] = [
                <tr key={`h-${g.cls}`} className="grouprow">
                  <td colSpan={4}>
                    <span className="gh">
                      <span className="gdot" style={{ background: g.color }} />
                      {g.label} {arr.length} event{arr.length !== 1 ? "s" : ""}
                      {g.cls === "cond" ? " — condition varies" : ""}
                    </span>
                  </td>
                </tr>,
              ];
              arr.forEach((u) =>
                rows.push(
                  <ClickRow key={u.event} href={`/events/${encodeURIComponent(u.event)}`}>
                    <td>
                      <span className="ename">{u.event}</span>
                    </td>
                    <td>
                      <CategoryTag category={u.category} derivative={u.derivative} />
                    </td>
                    <td className="c-status">
                      <ChangeBadge change={u.change} />
                    </td>
                    <ChevCell />
                  </ClickRow>
                )
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
