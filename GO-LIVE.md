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

## Later (fast-follow): turn on the auto-sync

Right now the site shows the seeded snapshot. To make it update itself daily from the Google Sheet,
add these env vars in Vercel (**Settings → Environment Variables**) and redeploy — no code changes:

- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role key)
- `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  (see the main `README.md` for the 3-step service-account setup)
- `CRON_SECRET` and `SYNC_SECRET` (any long random string; set both to the same value)

`vercel.json` already registers the daily 6:00 UTC cron. Until you add these, the cron just no-ops
safely and the seeded data stays put — updating it manually is a quick re-run of `seed.sql` or a
`POST /api/sync`.
