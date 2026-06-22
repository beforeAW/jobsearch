# jsearch

Private job dashboard built with Next.js + Prisma + Supabase Postgres.

This project lets you:

- Keep a private, single-user login-protected dashboard
- Sync jobs from Arbetsformedlingen (Jobtech API)
- Run automatic syncing with Vercel Cron
- Search and filter jobs in your own UI

## Stack

- Next.js (App Router)
- Prisma ORM
- Supabase PostgreSQL
- Vercel Cron

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set these required values:

- `DATABASE_URL`: Supabase pooled connection (port 6543)
- `DIRECT_URL`: Supabase direct connection (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`: your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key
- `APP_LOGIN_PASSWORD`: password for your private dashboard
- `APP_SESSION_SECRET`: random secret for cookie signing
- `CRON_SECRET`: random secret that Vercel cron sends in Authorization header

Optional sync tuning:

- `AF_SEARCH_QUERY` (default: `utvecklare`)
- `AF_SYNC_LIMIT` (default: `100`, max `200`)

## 3) Prepare Prisma

```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_arbetsformedlingen_fields
```

If you do not want migrations yet:

```bash
npm run prisma:push
```

## 4) Run locally

```bash
npm run dev
```

Open http://localhost:3000 and log in with `APP_LOGIN_PASSWORD`.

## 5) Set up Vercel Cron

This repo includes `vercel.json` with:

- Path: `/api/cron/sync-jobs`
- Schedule: every 6 hours (`0 */6 * * *`)

In Vercel project settings, add `CRON_SECRET` with the same value as your runtime environment. Vercel sends this as:

`Authorization: Bearer <CRON_SECRET>`

## Important endpoints

- `POST /api/auth/login`: creates dashboard session
- `POST /api/auth/logout`: clears dashboard session
- `GET /api/cron/sync-jobs`: cron-protected job sync
- `POST /api/jobs/sync`: manual sync button from UI

## Useful scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:push`
- `npm run prisma:studio`
