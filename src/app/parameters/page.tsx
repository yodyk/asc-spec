import { getParameterList } from "@/lib/queries";
import { ClickRow } from "@/components/ClickRow";
import { ChevCell } from "@/components/ui";

export default async function ParametersPage() {
  const params = await getParameterList();
  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Parameters</h1>
        <p className="psub">
          The full parameter dictionary — {params.length} in all. Open any one to see what it means and{" "}
          <b>every event that uses it</b>.
        </p>
      </div>
      <div className="tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Used on</th>
              <th>Values</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <ClickRow key={p.name} href={`/parameters/${encodeURIComponent(p.name)}`}>
                <td>
                  <span className="pname">{p.name}</span>
                  {p.definition && <div className="cellsub">{p.definition}</div>}
                </td>
                <td>{p.valueType ? <span className="pill type">{p.valueType}</span> : <span className="muted">—</span>}</td>
                <td className="tabnum muted">
                  {p.usedOn} event{p.usedOn !== 1 ? "s" : ""}
                </td>
                <td>{p.mappedCount ? <span className="valcount">{p.mappedCount} values</span> : <span className="muted">free text</span>}</td>
                <ChevCell />
              </ClickRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
