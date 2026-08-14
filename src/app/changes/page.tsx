import Link from "next/link";
import { getChanges, type ChangeItem } from "@/lib/queries";
import { SPEC_VERSION } from "@/lib/supabase";
import { Icon } from "@/components/icons";

function hrefFor(it: ChangeItem) {
  if (it.entity === "event") return `/events/${encodeURIComponent(it.name)}`;
  if (it.onEvent) return `/events/${encodeURIComponent(it.onEvent)}`;
  return `/parameters/${encodeURIComponent(it.name)}`;
}

function ChangeRow({ it }: { it: ChangeItem }) {
  const isNew = it.kind === "added";
  return (
    <Link href={hrefFor(it)} className="chgitem">
      <span className={`ci ${isNew ? "new" : "upd"}`}>
        <Icon name={isNew ? "plus" : "pencil"} size={16} />
      </span>
      <span className="cbody">
        <span className="cn">{it.name}</span>
        <span className="ck">
          {it.entity}
          {it.onEvent ? ` · on ${it.onEvent}` : ""}
        </span>
      </span>
      <span className="cgo">
        <Icon name="chevR" size={16} />
      </span>
    </Link>
  );
}

export default async function ChangesPage() {
  const { items, newCount, updatedCount } = await getChanges();
  const news = items.filter((i) => i.kind === "added");
  const updated = items.filter((i) => i.kind === "changed");

  return (
    <>
      <div className="phead">
        <h1 className="ptitle">What’s changed</h1>
        <p className="psub">Everything new or updated in the current release of the ASC standard.</p>
      </div>

      <div className="rel">
        <div className="rel-head">
          <span className="rel-badge">Spec {SPEC_VERSION}</span>
          <span className="rel-title">Current release</span>
          <span className="rel-meta">
            {newCount} new · {updatedCount} updated
          </span>
        </div>

        {news.length > 0 && (
          <>
            <div className="chgsub">
              <span className="gdot" style={{ background: "var(--new)" }} />
              New
            </div>
            {news.map((it, i) => (
              <ChangeRow key={`n${i}`} it={it} />
            ))}
          </>
        )}
        {updated.length > 0 && (
          <>
            <div className="chgsub">
              <span className="gdot" style={{ background: "var(--warn)" }} />
              Updated
            </div>
            {updated.map((it, i) => (
              <ChangeRow key={`u${i}`} it={it} />
            ))}
          </>
        )}
        {items.length === 0 && (
          <div className="empty">
            <div className="big">
              <Icon name="search" size={38} />
            </div>
            <p>No changes recorded in this release.</p>
          </div>
        )}
      </div>
    </>
  );
}
