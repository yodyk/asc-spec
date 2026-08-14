import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

// Always run fresh, allow up to a minute for the sheet read + writes.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const header = req.headers.get("authorization") || "";
  // Vercel Cron sends `Bearer <CRON_SECRET>`. Manual triggers may use SYNC_SECRET.
  const secrets = [process.env.CRON_SECRET, process.env.SYNC_SECRET].filter(Boolean);
  return secrets.some((s) => header === `Bearer ${s}`);
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// Vercel Cron issues GET; manual triggers can POST.
export const GET = handle;
export const POST = handle;
