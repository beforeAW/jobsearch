import { prisma } from "@/lib/prisma";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type JobRow = {
  id: string;
  title: string;
  company: string;
  description: string | null;
  applyUrl: string | null;
  occupation: string | null;
  region: string | null;
  publishedAt: Date | null;
  lastPublicationAt: Date | null;
};

type JobClient = {
  findMany: (args: unknown) => Promise<JobRow[]>;
  count: (args: unknown) => Promise<number>;
  findFirst: (args: unknown) => Promise<{ updatedAt: Date } | null>;
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = one(params.q).trim();
  const region = one(params.region).trim();
  const company = one(params.company).trim();
  const synced = one(params.synced) === "1";
  const syncError = one(params.syncError) === "1";
  const syncMessage = one(params.message);
  const upserted = one(params.upserted);

  const filters: Array<Record<string, unknown>> = [{ isRemoved: false }];

  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { occupation: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (region) {
    filters.push({ region: { contains: region, mode: "insensitive" } });
  }

  if (company) {
    filters.push({ company: { contains: company, mode: "insensitive" } });
  }

  const where = { AND: filters };

  const jobClient = prisma.job as unknown as JobClient;

  const [jobsRaw, total, latestUpdate] = await Promise.all([
    jobClient.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    jobClient.count({ where }),
    jobClient.findFirst({
      where: { isRemoved: false },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const jobs = jobsRaw as JobRow[];

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <p className="hero-kicker">jsearch</p>
          <h1>Your Arbetsformedlingen Filter Layer</h1>
          <p>
            Personal, focused, and private. Search jobs with your own layout and
            sync from the official source automatically.
          </p>
        </div>
        <div className="hero-actions">
          <form method="POST" action="/api/jobs/sync">
            <button type="submit">Sync Now</button>
          </form>
          <form method="POST" action="/api/auth/logout">
            <button type="submit" className="button-secondary">
              Logout
            </button>
          </form>
        </div>
      </section>

      {synced ? (
        <p className="notice success">Sync complete. Upserted {upserted || "0"} jobs.</p>
      ) : null}

      {syncError ? (
        <p className="notice error">
          Sync failed. {syncMessage ? `Details: ${syncMessage}` : "Check server logs."}
        </p>
      ) : null}

      <section className="stats-bar">
        <p>
          <strong>{total}</strong> matching jobs
        </p>
        <p>Latest update: {formatDate(latestUpdate?.updatedAt ?? null)}</p>
      </section>

      <section className="filters-card">
        <form className="filters-grid" method="GET">
          <label>
            Search text
            <input name="q" defaultValue={q} placeholder="python, frontend, data" />
          </label>
          <label>
            Region
            <input name="region" defaultValue={region} placeholder="Stockholm" />
          </label>
          <label>
            Company
            <input name="company" defaultValue={company} placeholder="Volvo" />
          </label>
          <button type="submit">Apply Filters</button>
        </form>
      </section>

      <section className="jobs-list">
        {jobs.length === 0 ? (
          <article className="job-card empty">
            <h2>No jobs match your filter</h2>
            <p>Try widening your search terms or run a fresh sync.</p>
          </article>
        ) : (
          jobs.map((job) => (
            <article key={job.id} className="job-card">
              <header>
                <p className="chip">{job.occupation ?? "Role"}</p>
                <p>{job.region ?? "Region unknown"}</p>
              </header>
              <h2>{job.title}</h2>
              <p className="company">{job.company}</p>
              <p className="meta">
                Published: {formatDate(job.publishedAt)} | Last day: {formatDate(job.lastPublicationAt)}
              </p>
              <p className="description">{job.description?.slice(0, 420) ?? "No description available."}</p>
              {job.applyUrl ? (
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  Open listing
                </a>
              ) : null}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
