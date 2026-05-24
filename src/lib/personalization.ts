import type { NewsItem } from "@/components/NewsCard";

// ─── Topic metadata ────────────────────────────────────────────────────────────

export const TOPIC_LABELS: Record<string, string> = {
  "threat-intelligence": "Threat Intelligence",
  "cves": "CVEs",
  "ai-security": "AI Security",
  "red-team": "Red Team",
  "blue-team": "Blue Team",
  "deception-technology": "Deception Technology",
  "honeypots": "Honeypots",
  "soc": "SOC",
  "cloud-security": "Cloud Security",
  "kubernetes-security": "Kubernetes Security",
};

/** Maps onboarding topic ID → article category string */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  "threat-intelligence": "Threat Intelligence",
  "cves": "CVEs",
  "ai-security": "AI Security",
  "red-team": "Red Team",
  "blue-team": "Blue Team",
  "deception-technology": "Deception Technology",
  "honeypots": "Honeypots",
  "soc": "SOC",
  "cloud-security": "Cloud Security",
  "kubernetes-security": "Kubernetes Security",
};

/** Keywords to match against title + summary for each topic */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "threat-intelligence": ["threat", "apt", "malware", "ransomware", "phishing", "campaign", "threat actor", "ioc"],
  "cves": ["cve", "vulnerability", "exploit", "patch", "nvd", "cvss", "zero day", "0day"],
  "ai-security": ["ai", "llm", "prompt injection", "jailbreak", "model", "foundation model", "agent attack", "alignment"],
  "red-team": ["red team", "pentest", "offensive", "adversary simulation", "exploitation", "lateral movement"],
  "blue-team": ["blue team", "detection", "edr", "xdr", "defend", "detection engineering", "defender"],
  "deception-technology": ["deception", "honeypot", "decoy", "lure", "canary"],
  "honeypots": ["honeypot", "honeynet", "decoy", "lure", "canary token"],
  "soc": ["soc", "siem", "incident response", "alert", "triage", "playbook", "analyst"],
  "cloud-security": ["cloud", "aws", "azure", "gcp", "eks", "s3", "iam", "cloud security", "misconfig"],
  "kubernetes-security": ["kubernetes", "k8s", "container", "pod", "eks", "aks", "gke", "container escape"],
};

/** Topics where AI-adjacent content earns an extra overlap bonus */
const AI_OVERLAP_TOPICS = new Set(["ai-security"]);

// ─── Scoring ───────────────────────────────────────────────────────────────────

export function computePersonalScore(
  item: Pick<NewsItem, "title" | "summary" | "category">,
  interests: string[]
): number {
  if (interests.length === 0) return 0;

  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  let score = 0;

  for (const topic of interests) {
    // +3 exact category match
    if (TOPIC_TO_CATEGORY[topic] === item.category) {
      score += 3;
    }

    // +2 keyword match in title/summary
    const keywords = TOPIC_KEYWORDS[topic] ?? [];
    if (keywords.some((kw) => haystack.includes(kw))) {
      score += 2;
    }

    // +1 AI security overlap
    if (
      AI_OVERLAP_TOPICS.has(topic) &&
      (haystack.includes("ai") ||
        haystack.includes("llm") ||
        haystack.includes("model"))
    ) {
      score += 1;
    }
  }

  return score;
}

/**
 * Returns the display labels of interests that matched this article,
 * used by the "Why am I seeing this?" explanation panel.
 */
export function getMatchedInterestTopics(
  item: Pick<NewsItem, "title" | "summary" | "category">,
  interests: string[]
): string[] {
  if (interests.length === 0) return [];

  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  const matched: string[] = [];

  for (const topic of interests) {
    const label    = TOPIC_TO_CATEGORY[topic] ?? topic;
    const keywords = TOPIC_KEYWORDS[topic] ?? [];

    const categoryHit = TOPIC_TO_CATEGORY[topic] === item.category;
    const keywordHit  = keywords.some((kw) => haystack.includes(kw));
    const overlapHit  =
      AI_OVERLAP_TOPICS.has(topic) &&
      (haystack.includes("ai") || haystack.includes("llm") || haystack.includes("model"));

    if (categoryHit || keywordHit || overlapHit) {
      matched.push(label);
    }
  }

  return [...new Set(matched)];
}

// ─── Sorting (superseded by feedScoring.ts scoreFeed) ─────────────────────────
// Kept as a lightweight fallback; primary sorting is done by scoreFeed().

const SIGNAL_ORDER: Record<string, number> = {
  "High Signal": 0,
  "Relevant": 1,
  "General": 2,
};

function sortPersonalized<T extends NewsItem>(
  items: T[],
  personalScores: Map<string, number>
): T[] {
  return [...items].sort((a, b) => {
    const psA = personalScores.get(a.link) ?? 0;
    const psB = personalScores.get(b.link) ?? 0;

    if (psB !== psA) return psB - psA;

    const sigDiff =
      (SIGNAL_ORDER[a.signal] ?? 1) - (SIGNAL_ORDER[b.signal] ?? 1);
    if (sigDiff !== 0) return sigDiff;

    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });
}
