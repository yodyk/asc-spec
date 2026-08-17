# Go live in ~30 minutes (no Node needed)

Vercel builds the app in the cloud, so you don't install anything locally. Three accounts:
**Supabase** (database), **GitHub** (code), **Vercel** (hosting). All free tier.

---

## 1 · Database (Supabase) — ~10 min

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name + region, set a
   database password, create it. Wait for it to finish provisioning.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `supabase/migrations/0001_init.sql`, copy all of it, paste, **Run**. (Creates the tables.)
4. New query again. Open `supabase/seed.sql`, copy all, paste, **Run**. (Loads the full v1.2 spec —
   ~23 events, all parameters, mappings.) This can take a few seconds.
5. Left sidebar → **Project Settings → API**. Copy two values, you'll need them in step 3:
   - **Project URL**
   - **anon / public** API key

> ✅ At this point the data is live in the database. You can browse it under **Table editor → events**.

---

## 2 · Code on GitHub — ~5 min

From this project folder in a terminal:

```bash
git init
git add .
git commit -m "ASC Spec Explorer"
```

Then create an empty repo at [github.com/new](https://github.com/new) (no README), and run the two
commands GitHub shows you under **"…or push an existing repository"** (they look like):

```bash
git remote add origin https://github.com/YOU/asc-spec-explorer.git
git branch -M main
git push -u origin main
```

> No git? Install it once with `xcode-select --install`, or use GitHub Desktop.

---

## 3 · Deploy (Vercel) — ~10 min

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your GitHub repo.
   It auto-detects Next.js — leave the build settings as-is.
2. Expand **Environment Variables** and add these **two** (from Supabase step 1.5):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `NEXT_PUBLIC_SPEC_VERSION` | `1.2` |

3. **Deploy.** In a minute or two you get a live URL like `asc-spec-explorer.vercel.app`.

**That's it — share the URL with the ASC members.** 🎉

---

## Turn on the auto-sync (daily updates from the sheet)

The sync reads your sheet's **"publish to web"** CSV directly — **no Google Cloud / service
account needed**. You only add two secrets to Vercel and redeploy:

1. **Vercel → Settings → Environment Variables**, add (as normal vars — **not** `NEXT_PUBLIC_`):
   | Name | Value |
   |---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → the **service_role / secret** key (starts `sb_secret_…` or `eyJ…`) — this lets the sync write. |
   | `CRON_SECRET` | any long random string |
   | `SYNC_SECRET` | set it to the **same** value as `CRON_SECRET` |
2. **Redeploy** (Deployments → top → ⋯ → Redeploy).
3. The daily **6:00 UTC** cron (`vercel.json`) now runs automatically. To pull immediately instead
   of waiting, trigger it once:
   ```bash
   curl -X POST https://asc-spec.vercel.app/api/sync -H "Authorization: Bearer YOUR-SYNC_SECRET"
   ```
   You should get back a small JSON summary like `{"ok":true,"events":23,...}`.

Until you add those, the cron just no-ops safely and the seeded data stays put.

---

## Adding the Data Layer + Guidelines (one-time migration)

The Data Layer page, the FAQ/Requirements, per-mapped-value definitions, and the
complete Parameter_Mappings value lists are all populated by the sync — but they
need one new table + a couple of columns first.

1. **Supabase → SQL Editor → New query.** Open `supabase/migrations/0002_datalayer.sql`,
   copy all, paste, **Run**. (Adds the `datalayer_parameters` table plus a
   `mapping_note` / `sort_order` column. Safe to run more than once.)
2. **Re-run the sync** so the new content loads:
   ```bash
   curl -X POST https://asc-spec.vercel.app/api/sync -H "Authorization: Bearer YOUR-SYNC_SECRET"
   ```
   The JSON summary's `notes` will now include `datalayer=…`, `requirements=…`,
   `guidelines=…`. The **Data Layer** and **Guidelines** pages fill in immediately.

> Run the migration **before** the sync — the sync writes to those new columns, so
> it will error until the migration has been applied.
