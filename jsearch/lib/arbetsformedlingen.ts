import { prisma } from "@/lib/prisma";

const API_BASE_URL = "https://jobsearch.api.jobtechdev.se/search";

type JobtechEmployer = {
  name?: string | null;
  workplace?: string | null;
};

type JobtechAddress = {
  municipality?: string | null;
  region?: string | null;
  city?: string | null;
};

type JobtechLabelValue = {
  label?: string | null;
};

type JobtechDescription = {
  text?: string | null;
};

type JobtechHit = {
  id?: string | number | null;
  headline?: string | null;
  webpage_url?: string | null;
  employer?: JobtechEmployer | null;
  workplace_address?: JobtechAddress | null;
  description?: JobtechDescription | null;
  publication_date?: string | null;
  last_publication_date?: string | null;
  employment_type?: JobtechLabelValue | null;
  working_hours_type?: JobtechLabelValue | null;
  occupation?: JobtechLabelValue | null;
};

type JobtechSearchResponse = {
  hits?: JobtechHit[];
};

export type SyncResult = {
  fetched: number;
  upserted: number;
  skipped: number;
  query: string;
  limit: number;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function buildLocation(city: string | null, municipality: string | null, region: string | null): string | null {
  const parts = [city, municipality, region].filter((part): part is string => Boolean(part && part.trim()));
  if (parts.length === 0) {
    return null;
  }
  return Array.from(new Set(parts)).join(", ");
}

export async function syncArbetsformedlingenJobs(): Promise<SyncResult> {
  const query = process.env.AF_SEARCH_QUERY ?? "utvecklare";
  const limitRaw = process.env.AF_SYNC_LIMIT ?? "100";
  const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 100));

  const url = new URL(API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "jsearch/1.0",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Arbetsformedlingen API failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as JobtechSearchResponse;
  const hits = Array.isArray(data.hits) ? data.hits : [];

  let upserted = 0;
  let skipped = 0;

  for (const hit of hits) {
    const sourceId = typeof hit.id === "number" ? String(hit.id) : hit.id?.trim();
    const title = firstNonEmpty(hit.headline, "Untitled role");

    if (!sourceId || !title) {
      skipped += 1;
      continue;
    }

    const city = firstNonEmpty(hit.workplace_address?.city);
    const municipality = firstNonEmpty(hit.workplace_address?.municipality);
    const region = firstNonEmpty(hit.workplace_address?.region);
    const company =
      firstNonEmpty(hit.employer?.name, hit.employer?.workplace) ?? "Unknown employer";

    const jobData = {
      source: "arbetsformedlingen",
      title,
      company,
      city,
      region,
      location: buildLocation(city, municipality, region),
      description: firstNonEmpty(hit.description?.text),
      applyUrl: firstNonEmpty(hit.webpage_url),
      employmentType: firstNonEmpty(hit.employment_type?.label),
      workHoursType: firstNonEmpty(hit.working_hours_type?.label),
      occupation: firstNonEmpty(hit.occupation?.label),
      publishedAt: parseDate(hit.publication_date),
      lastPublicationAt: parseDate(hit.last_publication_date),
      isRemoved: false,
    };

    await prisma.job.upsert({
      where: { sourceId },
      create: {
        sourceId,
        ...jobData,
      },
      update: jobData,
    });

    upserted += 1;
  }

  return {
    fetched: hits.length,
    upserted,
    skipped,
    query,
    limit,
  };
}
