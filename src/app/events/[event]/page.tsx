import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/queries";
import { CategoryTag, ChangeBadge } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { EventParamsTable } from "@/components/EventParamsTable";
import { Icon } from "@/components/icons";
import { samplePayload } from "@/lib/payload";

export default async function EventDetailPage({ params }: { params: { event: string } }) {
  const name = decodeURIComponent(params.event);
  const e = await getEvent(name);
  if (!e) notFound();

  const sp = samplePayload(
    e.name,
    e.params.map((p) => ({ name: p.name, example: p.example, mapped: p.mapped, valueType: p.valueType }))
  );

  return (
    <>
      <div className="dhead">
        <div className="titlerow">
          <h1 className="ptitle mono">{e.name}</h1>
          <CopyButton text={e.name} className="copybtn" ariaLabel="Copy event name" />
        </div>
        <div className="dtags">
          <CategoryTag category={e.category} derivative={e.derivative} />
          <ChangeBadge change={e.change} />
          <Link href={`/events?group=${encodeURIComponent(e.group)}`} className="groupchip">
            {e.group}
          </Link>
        </div>
      </div>

      {e.description && <p className="ddesc">{e.description}</p>}

      <div className="statrow">
        <div className="statbox">
          <div className="n">{e.counts.total}</div>
          <div className="l">parameters</div>
        </div>
        <div className="statbox">
          <div className="n" style={{ color: "var(--pos)" }}>
            {e.counts.required}
          </div>
          <div className="l">always required</div>
        </div>
        <div className="statbox">
          <div className="n" style={{ color: "var(--warn)" }}>
            {e.counts.conditional}
          </div>
          <div className="l">conditional</div>
        </div>
        <div className="statbox">
          <div className="n" style={{ color: "var(--accent-2)" }}>
            {e.counts.mapped}
          </div>
          <div className="l">use allowed values</div>
        </div>
      </div>

      <details className="snip">
        <summary>
          <span className="schev">
            <Icon name="chevR" size={15} />
          </span>
          Example dataLayer payload
          <span className="sh">real values where the spec has them · ‹placeholders› otherwise</span>
        </summary>
        <div className="code">
          <CopyButton text={sp.text} className="copycode" label="Copy" />
          <pre>
            {"window.dataLayer.push({\n"}
            {sp.rows.map(([k, v], i) => (
              <span key={i}>
                {"  "}
                <span className="k">&quot;{k}&quot;</span>: <span className="s">{v}</span>
                {i < sp.rows.length - 1 ? "," : ""}
                {"\n"}
              </span>
            ))}
            {"});"}
          </pre>
        </div>
      </details>

      <div className="sectlabel">Parameters</div>
      <EventParamsTable eventName={e.name} params={e.params} />
    </>
  );
}
