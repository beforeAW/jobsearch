# jsearch

Next.js app with Prisma + Supabase + PostgreSQL.

## Stack

- Next.js (App Router)
- Prisma ORM
- Supabase (hosted PostgreSQL + optional Supabase client)

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment variables

Copy `.env.example` to `.env` and set your Supabase values:

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL`: Supabase pooled connection (port 6543)
- `DIRECT_URL`: Supabase direct connection (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`: your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key

You can find these in Supabase under:

- Project Settings -> Database -> Connection string
- Project Settings -> API

## 3) Generate Prisma client

```bash
npm run prisma:generate
```

## 4) Create migration and apply schema

```bash
npm run prisma:migrate -- --name init
```

If you only want to sync schema quickly (without creating migration files):

```bash
npm run prisma:push
```

## 5) Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Useful scripts

- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:push`
- `npm run prisma:studio`

## Files added for integration

- `prisma/schema.prisma`: PostgreSQL datasource + initial `Job` model
- `lib/prisma.ts`: singleton Prisma client
- `lib/supabase.ts`: Supabase JS client
