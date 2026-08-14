"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "./icons";
import { BrandIcon } from "./brand";
import { ThemeControl } from "./ThemeControl";
import { GROUPS } from "@/lib/spec";
import { SHEET_URL } from "@/lib/config";
import { SPEC_VERSION } from "@/lib/supabase";
import type { NavEvent } from "@/lib/queries";

type Counts = { events: number; parameters: number; mappings: number; changed: number };

export function Sidebar({
  navEvents,
  counts,
  open,
  onNavigate,
}: {
  navEvents: NavEvent[];
  counts: Counts;
  open: boolean;
  onNavigate: () => void;
}) {
  const path = usePathname();
  const currentEvent = path.startsWith("/events/") ? decodeURIComponent(path.split("/")[2] || "") : null;
  const [eventsOpen, setEventsOpen] = useState(path.startsWith("/events"));
  const initialGroup = currentEvent ? navEvents.find((e) => e.name === currentEvent)?.group : undefined;
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(initialGroup ? [initialGroup] : []));

  const groupOrder = GROUPS.map((g) => g.name)
    .filter((n) => navEvents.some((e) => e.group === n))
    .concat(navEvents.some((e) => e.group === "Other") ? ["Other"] : []);
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const dot = (c: string) => (c === "Conversion" ? "var(--accent)" : "var(--eng)");
  const toggleGroup = (g: string) =>
    setOpenGroups((s) => {
      const n = new Set(s);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });

  const NavItem = ({ href, icon, label, count, warn }: { href: string; icon: IconName; label: string; count?: number; warn?: boolean }) => (
    <Link href={href} className={`navitem ${active(href) ? "on" : ""}`} onClick={onNavigate}>
      <Icon name={icon} className="ic" size={18} />
      <span className="lbl">{label}</span>
      {count != null && <span className={`cnt ${warn ? "warn" : ""}`}>{count}</span>}
    </Link>
  );

  return (
    <aside className={`nav ${open ? "open" : ""}`}>
      <div className="brand">
        <div className="mark">
          <BrandIcon />
        </div>
        <div>
          <div className="bt1">Spec Explorer</div>
          <div className="bt2">STANDARD v{SPEC_VERSION}</div>
        </div>
      </div>

      <nav>
        <div className="navlabel">Browse</div>
        <NavItem href="/" icon="overview" label="Overview" />

        <button className={`navitem ${active("/events") ? "on" : ""}`} onClick={() => setEventsOpen((o) => !o)}>
          <Icon name="events" className="ic" size={18} />
          <span className="lbl">Events</span>
          <span className="cnt">{counts.events}</span>
          <span className={`tchev ${eventsOpen ? "open" : ""}`}>
            <Icon name="chevR" size={13} />
          </span>
        </button>
        {eventsOpen && (
          <div className="tree">
            {groupOrder.map((g) => {
              const evs = navEvents.filter((e) => e.group === g);
              const go = openGroups.has(g);
              return (
                <div key={g}>
                  <button className="treegroup" onClick={() => toggleGroup(g)}>
                    <span className={`tchev ${go ? "open" : ""}`}>
                      <Icon name="chevR" size={13} />
                    </span>
                    {g}
                    <span className="gc">{evs.length}</span>
                  </button>
                  {go &&
                    evs.map((e) => (
                      <Link
                        key={e.name}
                        href={`/events/${encodeURIComponent(e.name)}`}
                        onClick={onNavigate}
                        className={`treeitem ${currentEvent === e.name ? "on" : ""}`}
                      >
                        <span className="tdot" style={{ background: dot(e.category) }} />
                        {e.name}
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        )}

        <NavItem href="/parameters" icon="parameters" label="Parameters" count={counts.parameters} />
        <NavItem href="/mappings" icon="mappings" label="Mappings" count={counts.mappings} />
        <div className="navlabel">Track</div>
        <NavItem href="/changes" icon="changes" label="What’s changed" count={counts.changed} warn />
      </nav>

      <div className="navbtm">
        <a className="sheetlink full" href={SHEET_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={15} />
          View Spec Sheet Instead
        </a>
      </div>

      <div className="foot">
        <span className="sync">
          <span className="dot" /> Spec {SPEC_VERSION} - Active
        </span>
        <ThemeControl />
      </div>
    </aside>
  );
}
