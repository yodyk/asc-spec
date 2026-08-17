import { getGuidelines, getRequirements } from "@/lib/queries";
import { GuidelinesTabs } from "@/components/GuidelinesTabs";

// Always re-query on request — this page's data changes with each sync.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

      {reqs.length === 0 && faqs.length === 0 ? (
        <div className="emptystate">
          <p>Guidelines haven’t been loaded yet.</p>
          <p className="p2note">Run the latest sync to populate them.</p>
        </div>
      ) : (
        <GuidelinesTabs reqs={reqs} faqs={faqs} />
      )}
    </>
  );
}
