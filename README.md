# MUN Platform

A web application for **Model United Nations (MUN)** style sessions: delegations join a live session, the **Chair** runs speaker timers and motions, countries **propose motions** for the Chair to accept or ignore, delegates **vote**, and when the session ends the Chair receives a **PDF summary** of all motions that were put to a vote.

This README is written so you can **clone the repository**, create a **Supabase** project, run the **SQL** below, configure **environment variables**, and run the site locally or deploy it (e.g. to Vercel).

---

## Table of contents

1. [What you need](#what-you-need)
2. [Clone and install](#clone-and-install)
3. [Create a Supabase project](#create-a-supabase-project)
4. [Database schema (run in Supabase SQL Editor)](#database-schema-run-in-supabase-sql-editor)
5. [Enable Realtime](#enable-realtime)
6. [Motion attachments (Storage + optional columns)](#motion-attachments-storage--optional-columns)
7. [Environment variables](#environment-variables)
8. [Run locally](#run-locally)
9. [Using the application](#using-the-application)
10. [Deploying (e.g. Vercel)](#deploying-e.g-vercel)
11. [Security and limitations](#security-and-limitations)
12. [Troubleshooting](#troubleshooting)

---

## What you need

- **Node.js** 20.x or newer (recommended for Next.js 16)
- **npm** (comes with Node)
- A **Supabase** account ([supabase.com](https://supabase.com))
- A **Git** client to clone this repository

Optional but recommended for **motion file attachments** (PDF / Word):

- The **service role** key from Supabase (server-only; never commit it or expose it as `NEXT_PUBLIC_*`)

---

## Clone and install

```bash
git clone <your-fork-or-repo-url> mun-plateform
cd mun-plateform
npm install
```

---

## Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Wait until the project is healthy.
3. Open **Project Settings → API** and note:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (safe to use in the browser with Row Level Security in place; this app expects broad table access—see schema section)
   - **service_role** key (secret; **only** for server-side Storage uploads and signed download URLs for attachments)

---

## Database schema (run in Supabase SQL Editor)

Open the Supabase **SQL Editor**, create a new query, paste the **entire** script below, and run it once. It creates all tables, constraints, foreign keys, indexes needed by the app, and optional motion attachment columns.

```sql
-- =============================================================================
-- MUN Platform — full schema for Supabase (PostgreSQL)
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Extensions (gen_random_uuid is in pgcrypto; often already enabled on Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- sessions
-- -----------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_token text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- participants (delegations)
-- -----------------------------------------------------------------------------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  country_code text not null,
  country_name text not null,
  token text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, country_code)
);

create index if not exists participants_session_id_idx on public.participants (session_id);
create index if not exists participants_token_idx on public.participants (token);

-- -----------------------------------------------------------------------------
-- speaker_timers
-- -----------------------------------------------------------------------------
create table if not exists public.speaker_timers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  country_code text not null,
  country_name text not null,
  duration_seconds integer not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create index if not exists speaker_timers_session_active_idx
  on public.speaker_timers (session_id)
  where (is_active = true);

-- -----------------------------------------------------------------------------
-- motions
-- -----------------------------------------------------------------------------
create table if not exists public.motions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'proposed',
  motion_type text,
  proposer_participant_id uuid references public.participants (id) on delete set null,
  proposer_country_code text,
  proposer_country_name text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  attachment_storage_path text,
  attachment_filename text,
  attachment_mime text,
  constraint motions_status_check check (
    status in (
      'proposed',
      'voting',
      'passed',
      'failed',
      'withdrawn',
      'ignored'
    )
  )
);

create index if not exists motions_session_id_idx on public.motions (session_id);
create index if not exists motions_session_status_idx on public.motions (session_id, status);

-- -----------------------------------------------------------------------------
-- votes (one row per delegation per motion)
-- -----------------------------------------------------------------------------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  motion_id uuid not null references public.motions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  country_code text not null,
  country_name text not null,
  vote text not null,
  voted_at timestamptz not null default now(),
  constraint votes_vote_check check (vote in ('for', 'against', 'abstain')),
  unique (motion_id, participant_id)
);

create index if not exists votes_motion_id_idx on public.votes (motion_id);

-- -----------------------------------------------------------------------------
-- Grants: API routes use the anon key on the server. Adjust if you use RLS.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.sessions to anon, authenticated;
grant select, insert, update, delete on table public.participants to anon, authenticated;
grant select, insert, update, delete on table public.speaker_timers to anon, authenticated;
grant select, insert, update, delete on table public.motions to anon, authenticated;
grant select, insert, update, delete on table public.votes to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;
```

**Notes:**

- If tables **already exist** from an older setup, you may need to `alter table` instead of `create table`. The script uses `if not exists` for tables where supported; if you hit errors, drop dev tables or align manually.
- The app does **not** use Supabase Auth for delegates; it uses random **participant tokens** stored in `participants.token`. The Chair password is **SHA-256** hashed client-side and stored as `sessions.admin_token`.
- **Row Level Security (RLS):** the script grants `anon` full CRUD for simplicity (typical for a classroom / internal MUN lab). For a production deployment with untrusted users, you should **enable RLS** and replace these grants with explicit policies (not covered here).

---

## Enable Realtime

The session page subscribes to Postgres changes on `participants`, `speaker_timers`, `motions`, and `votes`. Add those tables to the `supabase_realtime` publication:

```sql
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.speaker_timers;
alter publication supabase_realtime add table public.motions;
alter publication supabase_realtime add table public.votes;
```

If a table is **already** in the publication, Supabase will error on duplicate add—you can ignore that line or remove it from the script.

You can also enable replication in the Dashboard: **Database → Publications → supabase_realtime** and tick the same tables.

---

## Motion attachments (Storage + optional columns)

Delegates may attach a **PDF** or **Word** file (`.pdf`, `.docx`, `.doc`, max 10 MB) to a motion proposal. That requires:

### 1. Storage bucket

1. In Supabase: **Storage → New bucket**
2. **Name:** `motion-attachments` (exact name; the code uses this constant)
3. **Public:** OFF (private bucket)

Uploads and signed download URLs use the **service role** on the server, which bypasses Storage RLS.

### 2. Database columns

If you created `motions` with the full script above, **`attachment_*` columns are already included**. If you have an older `motions` table without them, run:

```sql
alter table public.motions
  add column if not exists attachment_storage_path text,
  add column if not exists attachment_filename text,
  add column if not exists attachment_mime text;
```

### 3. Server environment variable

Set **`SUPABASE_SERVICE_ROLE_KEY`** in your server environment (e.g. `.env.local` locally, Vercel project settings in production). **Never** prefix it with `NEXT_PUBLIC_` and never expose it in client-side code.

- Without this key, **motion proposals without a file** still work.
- **With** a file, the API returns an error until the key and bucket exist.

The repository also contains `motion_attachment_columns.sql` with the same column `alter` as a small reference file.

---

## Environment variables

Create a file named **`.env.local`** in the project root (Next.js loads it automatically):

```bash
# Required — used in the browser and server
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key

# Optional — server only; required for motion file uploads + Chair download links
# Get from Supabase → Project Settings → API → service_role (secret)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The server also accepts **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** as fallbacks if the `NEXT_PUBLIC_*` variables are set; see `lib/supabase-server.ts`.

---

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Run production build       |
| `npm run lint` | ESLint                   |

---

## Using the application

### Create a session (Chair)

1. On the home page, choose to create a session with a **name** and **Chair password**.
2. The app stores a hashed admin token and redirects you to `/session/{id}`.
3. Use **Chair Login** in the header and enter the same password.

### Join as a country (delegate)

1. Open the session URL (or enter the session ID on the home page).
2. **Join as Country**, pick a delegation; the app assigns a secret token (stored in `localStorage`).

### Chair features

- **Speaker timer:** grant the floor and set duration.
- **Motions:** introduce a motion directly to a vote, or review **pending proposals** from countries (consider → opens vote; ignore → closes as ignored).
- **Attachments:** if a proposal or active motion has a file, use **Open attachment** (signed URL, opens in a new tab).
- **End session:** downloads a **PDF** summary of motions that reached a vote (`voting`, `passed`, `failed`, `withdrawn`), then deletes the session and related rows. Storage files under that session are removed when possible (requires service role).

### Country features

- Propose a motion (type, description, optional PDF/Word attachment) sent to the Chair for approval before voting.

---

## Deploying (e.g. Vercel)

1. Push the repository to GitHub and import the project in [Vercel](https://vercel.com).
2. Set the same environment variables as in [Environment variables](#environment-variables) in the Vercel project settings.
3. Deploy. The framework preset is **Next.js**.

Ensure **Supabase** allows requests from your deployment origin if you ever restrict API access (default Supabase projects accept browser calls with the anon key from any origin unless you add network rules).

---

## Security and limitations

- **Chair password** is hashed (SHA-256) before storage; it is not stored in plain text. Anyone with database access could still reset or read tokens—treat the database as sensitive.
- **Delegate tokens** are opaque secrets in `localStorage`; clearing storage loses the delegation slot until you pick the country again (if still free).
- **`SUPABASE_SERVICE_ROLE_KEY`** bypasses Postgres and Storage RLS. Keep it on the server only.
- This README’s **GRANT** model is convenient for workshops; it is **not** a hardened multi-tenant security model.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| “Session not found” when joining | Session ID correct; `sessions` row exists; `NEXT_PUBLIC_*` env vars set on the client build. |
| Realtime updates missing | Realtime publication includes `participants`, `speaker_timers`, `motions`, `votes`. |
| API errors on insert / select | Table names and columns match the schema script; grants to `anon` if not using custom RLS. |
| Motion upload fails with 503 | Create bucket `motion-attachments`; set `SUPABASE_SERVICE_ROLE_KEY` on the server. |
| Chair cannot open attachment | Same as above; motion row must have `attachment_storage_path`. |
| PDF not downloading on end session | Chair must confirm end session; response is `application/pdf`—popup blockers can interfere; check network tab for errors. |

---

## Tech stack

- **Next.js** (App Router)
- **React**
- **Supabase** (PostgreSQL, Realtime, Storage)
- **Tailwind CSS**
- **Framer Motion**, **Lucide React**, **jsPDF** (session summary PDF)

---

## License

If the repository root contains a `LICENSE` file, follow that file. Otherwise, clarify licensing with the repository owner.
