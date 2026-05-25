import { isHardExcluded, inferCategory, scoreArticle } from "./filterNews";
import { generateFallback } from "../ai/summarize";
import type { FeedItem } from "./fetchFeeds";

// ─── NVD API types (subset) ───────────────────────────────────────────────────

type NvdDescription = { lang: string; value: string };
type NvdCvssV3 = { cvssData: { baseScore: number; baseSeverity: string } };

type NvdCve = {
  id: string;
  published: string;
  descriptions: NvdDescription[];
  metrics?: {
    cvssMetricV31?: NvdCvssV3[];
    cvssMetricV30?: NvdCvssV3[];
  };
  references?: { url: string }[];
};

type NvdResponse = {
  vulnerabilities: Array<{ cve: NvdCve }>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const RESULTS_PER_PAGE = 20;
const LOOKBACK_DAYS = 30;
const TIMEOUT_MS = 3_000;
const SOURCE_ID = "nvd-cve";
const SOURCE_NAME = "NVD";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWindow(): { pubStartDate: string; pubEndDate: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 23);
  return {
    pubStartDate: fmt(new Date(Date.now() - LOOKBACK_DAYS * 86_400_000)),
    pubEndDate: fmt(new Date()),
  };
}

function englishDesc(cve: NvdCve): string {
  return cve.descriptions.find((d) => d.lang === "en")?.value ?? "";
}

function cvssScore(cve: NvdCve): number | null {
  return (
    cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
    cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
    null
  );
}

function buildTitle(cve: NvdCve): string {
  const desc = englishDesc(cve);
  const score = cvssScore(cve);
  const scoreTag = score !== null ? ` [CVSS ${score}]` : "";
  const short = desc.length > 90 ? desc.slice(0, 90).trimEnd() + "…" : desc;
  return `${cve.id}${scoreTag}: ${short}`;
}

function buildSummary(cve: NvdCve): string {
  const desc = englishDesc(cve);
  const score = cvssScore(cve);
  const severity =
    cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ??
    cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity;

  const prefix =
    score !== null && severity
      ? `[CVSS ${score} ${severity}] `
      : score !== null
      ? `[CVSS ${score}] `
      : "";

  const text = `${prefix}${desc}`;
  return text.length > 280 ? text.slice(0, 280).trimEnd() + "…" : text;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchNvdCves(): Promise<FeedItem[]> {
  const { pubStartDate, pubEndDate } = isoWindow();
  const url = new URL(NVD_API);
  url.searchParams.set("resultsPerPage", String(RESULTS_PER_PAGE));
  url.searchParams.set("pubStartDate", pubStartDate);
  url.searchParams.set("pubEndDate", pubEndDate);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let json: NvdResponse;

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "AI-News-Radar/1.0" },
    });

    if (!res.ok) {
      throw new Error(`NVD API responded with HTTP ${res.status}`);
    }

    json = (await res.json()) as NvdResponse;
  } finally {
    clearTimeout(timer);
  }

  const items: FeedItem[] = [];

  for (const { cve } of json.vulnerabilities ?? []) {
    const title = buildTitle(cve);

    if (isHardExcluded(title)) continue;

    const summary = buildSummary(cve);
    const link = `https://nvd.nist.gov/vuln/detail/${cve.id}`;

    const { category, matched: categoryMatched } = inferCategory(
      title,
      summary,
      "Security"
    );

    const { score, signal } = scoreArticle({
      title,
      summary,
      category,
      categoryMatched,
      sourceId: SOURCE_ID,
    });

    const intelligence = generateFallback({
      title,
      summary,
      category,
      source: SOURCE_NAME,
    });

    items.push({
      title,
      link,
      publishedAt:    new Date(cve.published).toISOString(),
      source:         SOURCE_NAME,
      category,
      sourceType:     "security",
      summary,
      signal,
      relevanceScore: score,
      intelligence,
    });
  }

  return items;
}
