"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { NavEvent } from "@/lib/queries";

export function Chrome({
  navEvents,
  counts,
  children,
}: {
  navEvents: NavEvent[];
  counts: { events: number; parameters: number; mappings: number; changed: number };
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app">
      <Sidebar navEvents={navEvents} counts={counts} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="main">
        <TopBar onMenu={() => setMenuOpen((o) => !o)} />
        <div className="content">
          <div className="inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
