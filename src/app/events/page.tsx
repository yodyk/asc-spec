import Link from "next/link";
import { getEventList } from "@/lib/queries";
import { CategoryTag, ChangeBadge, ChevCell } from "@/components/ui";
import { ClickRow } from "@/components/ClickRow";
import { Icon } from "@/components/icons";

const CHIPS: { f: string; l: string; dot: string | null }[] = [
  { f: "all", l: "All", dot: null },
  { f: "Engagement", l: "Engagement", dot: "var(--ink-soft)" },
  { f: "Conversion", l: "Conversion", dot: "var(--accent)" },
  { f: "changed", l: "Changed", dot: "var(--warn)" },
];

export default async function EventsPage({ searchParams }: { searchParams: { group?: string; cat?: string } }) {
  let events = await getEventList();
  const group = searchParams.group;
  const cat = searchParams.cat ?? "all";
  if (group) events = events.filter((e) => e.group === group);
  if (cat === "Engagement") events = events.filter((e) => e.category === "Engagement");
  else if (cat === "Conversion") events = events.filter((e) => e.category === "Conversion");
  else if (cat === "changed") events = events.filter((e) => e.change);

  const chipHref = (f: string) => {
    const parts = [];
    if (group) parts.push(`group=${encodeURIComponent(group)}`);
    if (f !== "all") parts.push(`cat=${f}`);
    return `/events${parts.length ? "?" + parts.join("&") : ""}`;
  };

  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Events</h1>
        <p className="psub">
          Every event in the ASC standard. Open one to see its parameters, requirements, and allowed values.
          {group ? ` Showing the ${group} group.` : ""}
        </p>
        <div className="filters">
          {CHIPS.map((c) => (
            <Link key={c.f} href={chipHref(c.f)} className={`chip ${cat === c.f ? "on" : ""}`}>
              {c.dot && <span className="dot" style={{ background: c.dot }} />}
              {c.l}
            </Link>
          ))}
        </div>
      </div>

      <div className="tablewrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>Parameters</th>
              <th>Required</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <div className="big">
                      <Icon name="search" size={38} />
                    </div>
                    <p>No events match.</p>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <ClickRow key={e.name} href={`/events/${encodeURIComponent(e.name)}`}>
                  <td>
                    <span className="ename">{e.name}</span>
                    {e.description && <div className="cellsub">{e.description}</div>}
                  </td>
                  <td>
                    <CategoryTag category={e.category} derivative={e.derivative} />
                  </td>
                  <td className="tabnum">{e.paramCount}</td>
                  <td className="tabnum muted" style={{ whiteSpace: "nowrap" }}>
                    {e.requiredCount}&nbsp;required
                  </td>
                  <td className="c-status">
                    <ChangeBadge change={e.change} />
                  </td>
                  <ChevCell />
                </ClickRow>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
