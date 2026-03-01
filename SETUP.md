# Phase 1 Setup Guide
## React + Supabase + Netlify

---

## Step 1 — Supabase project (5 min)

1. Go to **supabase.com** → sign up (free) → **New project**
2. Give it a name like `mlp-command-center`, pick a region close to you
3. Wait ~2 minutes for it to provision

### Run the database schema

4. In your Supabase dashboard → **SQL Editor** → **New query**
5. Open `src/lib/supabase.js` — the SQL is in the big comment block at the top
6. Copy everything between the `/*` and `*/` and paste it into the SQL editor
7. Click **Run** — you should see "Success"

### Get your API keys

8. Supabase dashboard → **Settings** (gear icon) → **API**
9. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 2 — Local setup (2 min)

```bash
# In your terminal, navigate to where you want the project
cd ~/Desktop

# Copy the mlp-app folder here, then:
cd mlp-app

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Open `.env` and fill in your Supabase values:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour_anon_key_here
```

---

## Step 3 — Run locally

```bash
npm run dev
```

Open **http://localhost:5173** — you should see the sign-in screen.

Create an account with any email/password. Your P0 projects and home items will auto-seed on first login.

---

## Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "Phase 1: React + Supabase"
git remote add origin https://github.com/ghost788/taskmanager.git
git push -u origin main
```

> **Note:** You can push to your existing `taskmanagerv1` repo or create a new one called `mlp-app`. Up to you.

---

## Step 5 — Deploy to Netlify

1. Netlify dashboard → your site → **Site configuration → Build & deploy**
2. Change:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables: **Environment variables → Add variable** (add both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
4. **Trigger deploy**

### OR — connect the new repo

If you created a new repo, go to Netlify → **Add new site → Import from GitHub** → pick the new repo → set build command + publish dir → add env vars → deploy.

---

## Step 6 — Configure Supabase auth redirect

1. Supabase dashboard → **Authentication → URL Configuration**
2. Add your Netlify URL to **Redirect URLs**:
   ```
   https://your-site.netlify.app
   https://your-site.netlify.app/**
   ```
3. Also add `http://localhost:5173` for local dev

---

## Your app is live ✓

- Data syncs across all devices (phone, laptop, etc.)
- Sign out / sign in on any device — everything persists
- PWA: on mobile, go to your Netlify URL in Safari/Chrome → **Add to Home Screen**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank screen on Netlify | Check env vars are set in Netlify dashboard |
| "Missing Supabase URL" error | Your `.env` file is missing or wrong |
| Can't sign up | Check Supabase → Authentication → Email auth is enabled |
| Data not loading | Open browser console — likely a RLS policy error. Re-run the SQL schema. |
| Build fails on Netlify | Make sure build command is `npm run build` and publish dir is `dist` |

---

## What's next — Phase 2

When you're ready:
- **Mobile app** (React Native + Expo) — installable on iPhone/Android
- **Google SSO** — one-click sign in
- **Push notifications** — daily workout & weight reminders
