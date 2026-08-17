"use client";
import { useState } from "react";
import { Icon } from "./icons";
import type { Guideline, Requirement } from "@/lib/queries";

function Paragraphs({ text }: { text: string }) {
  return <>{text.split("\n").map((line, i) => (line.trim() ? <p key={i}>{line}</p> : null))}</>;
}

export function GuidelinesTabs({ reqs, faqs }: { reqs: Requirement[]; faqs: Guideline[] }) {
  const [tab, setTab] = useState<"reqs" | "faq">(reqs.length ? "reqs" : "faq");

  return (
    <>
      <div className="tabs" role="tablist">
        {reqs.length > 0 && (
          <button
            role="tab"
            aria-selected={tab === "reqs"}
            className={`tab ${tab === "reqs" ? "on" : ""}`}
            onClick={() => setTab("reqs")}
          >
            Requirements <span className="tabc">{reqs.length}</span>
          </button>
        )}
        {faqs.length > 0 && (
          <button
            role="tab"
            aria-selected={tab === "faq"}
            className={`tab ${tab === "faq" ? "on" : ""}`}
            onClick={() => setTab("faq")}
          >
            Frequently asked <span className="tabc">{faqs.length}</span>
          </button>
        )}
      </div>

      {tab === "reqs" && (
        <ol className="reqlist">
          {reqs.map((r, i) => (
            <li className="req" key={i}>
              <span className="reqnum">{r.number ?? i + 1}</span>
              <div className="reqbody">
                {r.isNew && <span className="valnew">new</span>}
                <Paragraphs text={r.text} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === "faq" && (
        <div className="faqlist">
          {faqs.map((f, i) => (
            <details className="faq" key={i}>
              <summary>
                <span className="faq-q">{f.question}</span>
                <span className="faq-chev">
                  <Icon name="chevR" size={16} />
                </span>
              </summary>
              <div className="faq-a">
                <Paragraphs text={f.answer} />
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
