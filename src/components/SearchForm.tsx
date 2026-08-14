"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export function SearchForm({ big = false, defaultValue = "" }: { big?: boolean; defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);

  // "/" focuses the top-bar search (not the hero one).
  useEffect(() => {
    if (big) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== ref.current) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/");
  }

  return (
    <form onSubmit={submit} className={big ? "bigsearch" : "topsearch"} role="search">
      <Icon name="search" className="si" size={big ? 20 : 16} />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={big ? "Search events, parameters, or values…" : "Search…  press /"}
        aria-label="Search the spec"
        autoComplete="off"
      />
    </form>
  );
}
