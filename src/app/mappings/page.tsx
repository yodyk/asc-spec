import Link from "next/link";
import { getMappings } from "@/lib/queries";
import { Icon } from "@/components/icons";

export default async function MappingsPage() {
  const maps = await getMappings();
  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Mappings</h1>
        <p className="psub">
          Parameters that accept only a fixed set of values — here’s every accepted value for each.
        </p>
      </div>
      <div className="maplist">
        {maps.map((m) => (
          <Link key={m.name} href={`/parameters/${encodeURIComponent(m.name)}`} className="mapblock">
            <div className="mb-head">
              <span className="pname">{m.name}</span>
              <span className="mb-meta">
                {m.values.length} values · used on {m.usedOn} event{m.usedOn !== 1 ? "s" : ""}
              </span>
              <span className="mb-go">
                <Icon name="chevR" size={16} />
              </span>
            </div>
            <div className="vals">
              {m.values.map((v) => (
                <span className="val" key={v}>
                  {v}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
