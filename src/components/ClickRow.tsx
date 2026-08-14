"use client";
import { useRouter } from "next/navigation";

/** A table row that navigates on click / Enter / Space (accessible). */
export function ClickRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="click"
      tabIndex={0}
      role="button"
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </tr>
  );
}
