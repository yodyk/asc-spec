"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icons";

type Mode = "light" | "system" | "dark";
const MODES: { mode: Mode; icon: IconName; label: string }[] = [
  { mode: "light", icon: "sun", label: "Light" },
  { mode: "system", icon: "system", label: "System" },
  { mode: "dark", icon: "moon", label: "Dark" },
];

export function ThemeControl() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("ascTheme") as Mode | null;
      if (t) setMode(t);
    } catch {
      /* ignore */
    }
  }, []);

  function apply(m: Mode) {
    setMode(m);
    try {
      localStorage.setItem("ascTheme", m);
    } catch {
      /* ignore */
    }
    const root = document.documentElement;
    if (m === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", m);
  }

  return (
    <div className="themeseg" role="group" aria-label="Theme">
      {MODES.map((m) => (
        <button
          key={m.mode}
          className={mode === m.mode ? "on" : ""}
          aria-label={`${m.label} theme`}
          aria-pressed={mode === m.mode}
          title={m.label}
          onClick={() => apply(m.mode)}
        >
          <Icon name={m.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
