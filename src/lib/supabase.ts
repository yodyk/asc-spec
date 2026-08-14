import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)."
  );
}

/**
 * Public, read-only client used by server components. Uses the anon key, so
 * Row Level Security limits it to active rows of the derived tables + change_log.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/**
 * Privileged client for the sync only. Uses the service role key (bypasses RLS)
 * and MUST only ever run on the server. Throws if called without the key.
 */
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — sync cannot run.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const SPEC_VERSION = process.env.NEXT_PUBLIC_SPEC_VERSION ?? "1.2";
