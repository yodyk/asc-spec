"use client";
import { useState } from "react";
import { Icon } from "./icons";

export function CopyButton({
  text,
  className,
  label,
  ariaLabel,
}: {
  text: string;
  className?: string;
  label?: string;
  ariaLabel?: string;
}) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked — ignore */
    }
    setOk(true);
    setTimeout(() => setOk(false), 1300);
  }
  return (
    <button
      type="button"
      className={`${className ?? ""} ${ok ? "ok" : ""}`.trim()}
      onClick={copy}
      aria-label={ariaLabel ?? label ?? "Copy"}
      title={ariaLabel ?? label ?? "Copy"}
    >
      <Icon name={ok ? "check" : "copy"} size={label ? 14 : 15} />
      {label ? (ok ? "Copied" : label) : null}
    </button>
  );
}
