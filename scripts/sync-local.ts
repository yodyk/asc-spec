// Run the sync from your machine: `npm run sync:local`
// Loads .env.local first, then runs the same code the cron does.
import { config } from "dotenv";
config({ path: ".env.local" });

const { runSync } = await import("../src/lib/sync");

runSync()
  .then((r) => {
    console.log(r.ok ? "✓ sync ok" : "✗ sync failed", r);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error("✗ sync threw", e);
    process.exit(1);
  });
