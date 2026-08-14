import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="empty" style={{ paddingTop: "100px" }}>
      <div className="big">
        <Icon name="search" size={40} />
      </div>
      <p style={{ fontSize: "16px", color: "var(--ink-soft)" }}>That page isn’t in the spec.</p>
      <p>
        <Link href="/" className="cr link">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
