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
  filteredOut: number;
  query: string;
  limit: number;
};

type SyncFilters = {
  includeRegions: string[];
  excludeRegions: string[];
  includeCities: string[];
  includeCompanies: string[];
  excludeCompanies: string[];
  includeOccupations: string[];
  includeTitleKeywords: string[];
  excludeTitleKeywords: string[];
  publishedWithinDays: number | null;
};

type JobUpsertClient = {
  upsert: (args: unknown) => Promise<unknown>;
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

function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function parseNonNegativeInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function includesAny(text: string, terms: string[]): boolean {
  const haystack = text.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function loadSyncFilters(): SyncFilters {
  return {
    includeRegions: parseList(process.env.AF_FILTER_REGION_INCLUDE),
    excludeRegions: parseList(process.env.AF_FILTER_REGION_EXCLUDE),
    includeCities: parseList(process.env.AF_FILTER_CITY_INCLUDE),
    includeCompanies: parseList(process.env.AF_FILTER_COMPANY_INCLUDE),
    excludeCompanies: parseList(process.env.AF_FILTER_COMPANY_EXCLUDE),
    includeOccupations: parseList(process.env.AF_FILTER_OCCUPATION_INCLUDE),
    includeTitleKeywords: parseList(process.env.AF_FILTER_TITLE_INCLUDE),
    excludeTitleKeywords: parseList(process.env.AF_FILTER_TITLE_EXCLUDE),
    publishedWithinDays: parseNonNegativeInt(process.env.AF_FILTER_PUBLISHED_WITHIN_DAYS),
  };
}

function shouldIncludeHit(input: {
  title: string;
  company: string;
  city: string | null;
  region: string | null;
  occupation: string | null;
  publishedAt: Date | null;
  filters: SyncFilters;
}): boolean {
  const { title, company, city, region, occupation, publishedAt, filters } = input;

  const regionText = (region ?? "").toLowerCase();
  const cityText = (city ?? "").toLowerCase();
  const companyText = company.toLowerCase();
  const occupationText = (occupation ?? "").toLowerCase();

  if (filters.includeRegions.length > 0 && !includesAny(regionText, filters.includeRegions)) {
    return false;
  }

  if (filters.excludeRegions.length > 0 && includesAny(regionText, filters.excludeRegions)) {
    return false;
  }

  if (filters.includeCities.length > 0 && !includesAny(cityText, filters.includeCities)) {
    return false;
  }

  if (filters.includeCompanies.length > 0 && !includesAny(companyText, filters.includeCompanies)) {
    return false;
  }

  if (filters.excludeCompanies.length > 0 && includesAny(companyText, filters.excludeCompanies)) {
    return false;
  }

  if (filters.includeOccupations.length > 0 && !includesAny(occupationText, filters.includeOccupations)) {
    return false;
  }

  if (filters.includeTitleKeywords.length > 0 && !includesAny(title, filters.includeTitleKeywords)) {
    return false;
  }

  if (filters.excludeTitleKeywords.length > 0 && includesAny(title, filters.excludeTitleKeywords)) {
    return false;
  }

  if (filters.publishedWithinDays !== null) {
    if (!publishedAt) {
      return false;
    }

    const maxAgeMs = filters.publishedWithinDays * 24 * 60 * 60 * 1000;
    const ageMs = Date.now() - publishedAt.getTime();

    if (ageMs > maxAgeMs) {
      return false;
    }
  }

  return true;
}

export async function syncArbetsformedlingenJobs(): Promise<SyncResult> {
  const query = process.env.AF_SEARCH_QUERY ?? "utvecklare";
  const limitRaw = process.env.AF_SYNC_LIMIT ?? "100";
  const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 100));
  const filters = loadSyncFilters();

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
  let filteredOut = 0;
  const jobClient = prisma.job as unknown as JobUpsertClient;

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
    const occupation = firstNonEmpty(hit.occupation?.label);
    const publishedAt = parseDate(hit.publication_date);

    const allowedByFilters = shouldIncludeHit({
      title,
      company,
      city,
      region,
      occupation,
      publishedAt,
      filters,
    });

    if (!allowedByFilters) {
      filteredOut += 1;
      continue;
    }

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
      occupation,
      publishedAt,
      lastPublicationAt: parseDate(hit.last_publication_date),
      isRemoved: false,
    };

    await jobClient.upsert({
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
    filteredOut,
    query,
    limit,
  };
}
