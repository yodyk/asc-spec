import { getDataLayer } from "@/lib/queries";
import { DataLayerTable } from "@/components/DataLayerTable";
import { Icon } from "@/components/icons";

// Always re-query on request — this page's data changes with each sync.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DataLayerPage() {
  const { params, notes } = await getDataLayer();

  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Data Layer</h1>
        <p className="psub">
          The base parameters that ride along on every event — store and vehicle details, the page context, and the
          measurement IDs that decide where events are sent.
        </p>
      </div>

      {notes.map((n, i) => (
        <div className="notebar big" key={i}>
          <span className="i">
            <Icon name="info" size={18} />
          </span>
          <div>
            {n.split("\n").map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        </div>
      ))}

      {params.length ? (
        <DataLayerTable params={params} />
      ) : (
        <div className="emptystate">
          <p>The data layer hasn’t been loaded yet.</p>
          <p className="p2note">Run the latest sync to populate it.</p>
        </div>
      )}
    </>
  );
}
