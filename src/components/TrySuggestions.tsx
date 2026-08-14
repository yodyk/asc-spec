"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Placeholder-style search hints that quietly cycle, one at a time, the way
// the prompt hints do in modern AI chat boxes. Each swap re-keys the button so
// the CSS `try-flip` animation replays and the new term rises into place.
const TERMS = [
  "page_type",
  "asc_form_submission",
  "comm_outcome",
  "department",
  "item_condition",
  "flow_outcome",
  "event_owner",
  "asc_pageview",
];

export function TrySuggestions() {
  const router = useRouter();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % TERMS.length), 2800);
    return () => clearInterval(id);
  }, []);

  const term = TERMS[i];
  return (
    <div className="try-line">
      <span className="lbl">Try</span>
      <span className="try-slot">
        <button
          key={term}
          type="button"
          className="try-term"
          onClick={() => router.push(`/search?q=${encodeURIComponent(term)}`)}
        >
          {term}
        </button>
      </span>
    </div>
  );
}
