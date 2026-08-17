import { getGuidelines, getRequirements } from "@/lib/queries";
import { Icon } from "@/components/icons";

// Always re-query on request — this page's data changes with each sync.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.trim() ? <p key={i}>{line}</p> : null
      )}
    </>
  );
}

export default async function GuidelinesPage() {
  const [reqs, faqs] = await Promise.all([getRequirements(), getGuidelines()]);

  return (
    <>
      <div className="phead">
        <h1 className="ptitle">Guidelines</h1>
        <p className="psub">
          The rules that govern the standard, and answers to the questions that come up most when implementing it.
        </p>
      </div>

      {reqs.length > 0 && (
        <>
          <div className="sectlabel">Requirements</div>
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
        </>
      )}

      {faqs.length > 0 && (
        <>
          <div className="sectlabel">Frequently asked</div>
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
        </>
      )}

      {reqs.length === 0 && faqs.length === 0 && (
        <div className="emptystate">
          <p>Guidelines haven’t been loaded yet.</p>
          <p className="p2note">Run the latest sync to populate them.</p>
        </div>
      )}
    </>
  );
}
