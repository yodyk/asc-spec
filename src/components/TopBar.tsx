"use client";
import { Fragment } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "./icons";
import { GoogleG } from "./brand";
import { SearchForm } from "./SearchForm";
import { SHEET_URL } from "@/lib/config";

const SECTION_LABEL: Record<string, string> = {
  events: "Events",
  parameters: "Parameters",
  mappings: "Mappings",
  changes: "What’s changed",
  search: "Search",
};

type Crumb = { label: string; href?: string };

function buildCrumbs(path: string): Crumb[] {
  if (path === "/") return [{ label: "Overview" }];
  const seg = path.split("/").filter(Boolean);
  const label0 = SECTION_LABEL[seg[0]] ?? seg[0];
  if (seg.length === 1) return [{ label: label0 }];
  return [{ label: label0, href: `/${seg[0]}` }, { label: decodeURIComponent(seg[1]) }];
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const crumbs = buildCrumbs(usePathname());
  return (
    <div className="topbar">
      <button className="menubtn" onClick={onMenu} aria-label="Open navigation">
        <Icon name="menu" size={18} />
      </button>
      <button className="back" onClick={() => router.back()} aria-label="Go back">
        <Icon name="chevL" size={17} />
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {c.href ? (
              <Link href={c.href} className="cr link">
                {c.label}
              </Link>
            ) : (
              <span className="cr cur">{c.label}</span>
            )}
          </Fragment>
        ))}
      </div>
      <div className="topright">
        <SearchForm />
        <a className="sheetlink" href={SHEET_URL} target="_blank" rel="noopener noreferrer">
          <GoogleG />
          View Google Sheet
        </a>
      </div>
    </div>
  );
}
