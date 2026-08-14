import { search } from "@/lib/queries";
import { CategoryTag, ChevCell } from "@/components/ui";
import { ClickRow } from "@/components/ClickRow";
import { Icon } from "@/components/icons";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || "").trim();
  const res = q ? await search(q) : { events: [], params: [] };
  const total = res.events.length + res.params.length;

  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Search</h1>
        <p className="psub">
          {q ? (
            <>
              {total} result{total !== 1 ? "s" : ""} for “<b>{q}</b>”
            </>
          ) : (
            "Type in the search box above."
          )}
        </p>
      </div>

      {res.events.length > 0 && (
        <>
          <div className="sectlabel" style={{ marginTop: "6px" }}>
            Events · {res.events.length}
          </div>
          <div className="tablewrap">
            <table className="tbl">
              <tbody>
                {res.events.map((e) => (
                  <ClickRow key={e.name} href={`/events/${encodeURIComponent(e.name)}`}>
                    <td>
                      <span className="ename">{e.name}</span>
                    </td>
                    <td>
                      <CategoryTag category={e.category} derivative={e.derivative} />
                    </td>
                    <td className="tabnum muted">{e.paramCount} params</td>
                    <ChevCell />
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {res.params.length > 0 && (
        <>
          <div className="sectlabel">Parameters · {res.params.length}</div>
          <div className="tablewrap">
            <table className="tbl">
              <tbody>
                {res.params.map((p) => (
                  <ClickRow key={p.name} href={`/parameters/${encodeURIComponent(p.name)}`}>
                    <td>
                      <span className="pname">{p.name}</span>
                    </td>
                    <td className="tabnum muted">{p.usedOn} events</td>
                    <ChevCell />
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {q && total === 0 && (
        <div className="empty">
          <div className="big">
            <Icon name="search" size={38} />
          </div>
          <p>Nothing matches “{q}”.</p>
        </div>
      )}
    </>
  );
}
