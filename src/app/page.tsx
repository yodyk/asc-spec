import Link from "next/link";
import { getOverview } from "@/lib/queries";
import { SPEC_VERSION } from "@/lib/supabase";
import { BrandWordmark } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { SearchForm } from "@/components/SearchForm";

const TILE_META: { href: string; icon: IconName; title: string; desc: string; key: "events" | "parameters" | "mappings" | "changed" }[] = [
  { href: "/events", icon: "events", title: "Events", desc: "Grouped by what they track.", key: "events" },
  { href: "/parameters", icon: "parameters", title: "Parameters", desc: "Look one up, see every event it’s on.", key: "parameters" },
  { href: "/mappings", icon: "mappings", title: "Mappings", desc: "Parameters with a fixed list of values.", key: "mappings" },
  { href: "/changes", icon: "changes", title: "Changed", desc: "Recent updates, tracked automatically.", key: "changed" },
];
const EXAMPLES = ["page_type", "asc_form_submission", "comm_outcome", "department"];

export default async function OverviewPage() {
  const { counts, groups, recent } = await getOverview();
  return (
    <>
      <div className="hero">
        <div className="wordmark">
          <BrandWordmark />
        </div>
        <h1>The ASC spec, finally searchable.</h1>
        <p>
          The complete Automotive Standards Council standard — search it, explore every event and parameter, and see
          what’s new in each release.
        </p>
        <SearchForm big />
        <div className="hero-chips">
          <span className="lbl">Try</span>
          {EXAMPLES.map((x) => (
            <Link key={x} href={`/search?q=${encodeURIComponent(x)}`} className="schip">
              {x}
            </Link>
          ))}
        </div>
        <div className="hero-fresh">
          <span className="dot" /> Spec {SPEC_VERSION} · current release
        </div>
      </div>

      <div className="tiles">
        {TILE_META.map((t) => (
          <Link key={t.href} href={t.href} className="tile">
            <span className="tic">
              <Icon name={t.icon} size={20} />
            </span>
            <span className="tnum">{counts[t.key]}</span>
            <span className="tt">{t.title}</span>
            <span className="td">{t.desc}</span>
          </Link>
        ))}
      </div>

      <div className="ov-sec">
        <h3 className="ov-h">Browse by group</h3>
        <div className="groupgrid">
          {groups.map((g) => (
            <Link key={g.name} href={`/events?group=${encodeURIComponent(g.name)}`} className="groupcard">
              <span className="gname">{g.name}</span>
              <span className="gnum">{g.count} events</span>
              <span className="gcgo">
                <Icon name="chevR" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="ov-sec">
        <h3 className="ov-h">
          Latest changes{" "}
          <Link href="/changes" className="more">
            View all changes
          </Link>
        </h3>
        <div className="ovchanges">
          {recent.map((e) => (
            <Link key={e.name} href={`/events/${encodeURIComponent(e.name)}`} className="chgitem">
              <span className={`ci ${e.change === "NEW" ? "new" : "upd"}`}>
                <Icon name={e.change === "NEW" ? "plus" : "pencil"} size={16} />
              </span>
              <span className="cbody">
                <span className="cn">{e.name}</span>
                <span className="ck">event · {e.paramCount} params</span>
              </span>
              <span className="cgo">
                <Icon name="chevR" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
