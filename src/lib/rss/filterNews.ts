export type SignalLevel = "High Signal" | "Relevant" | "General";

// ─── Hard exclusions ─────────────────────────────────────────────────────────
// Drop any article whose title contains one of these (case-insensitive).

export const HARD_EXCLUSIONS: string[] = [
  "spacex",
  "waymo",
  "green card",
  "sleep",
  "uganda",
  "rocket",
  "crypto",
  "shipping",
  "robotaxi",
  "apple keynote",
];

export function isHardExcluded(title: string): boolean {
  const t = title.toLowerCase();
  return HARD_EXCLUSIONS.some((ex) => t.includes(ex));
}

// ─── Keyword lists ────────────────────────────────────────────────────────────

export const CYBER_KEYWORDS: string[] = [
  "cve",
  "vulnerability",
  "vulnerabilities",
  "exploit",
  "exploited",
  "exploitation",
  "threat",
  "malware",
  "ransomware",
  "security",
  "red team",
  "blue team",
  "soc",
  "honeypot",
  "deception",
  "zero day",
  "0day",
  "kubernetes",
  "cloud security",
  "attack",
  "phishing",
  "apt",
  "mitre",
  "edr",
  "xdr",
  "siem",
  "incident response",
  "threat intel",
  "adversary",
  "pipeline attack",
  "credential",
  "container escape",
  "prompt injection",
  "ai security",
  "rce",
  "remote code execution",
  "privilege escalation",
  "supply chain",
  "lateral movement",
  "exfiltration",
  "backdoor",
  "rootkit",
  "pentest",
  "penetration test",
  "red teaming",
  "blue teaming",
  "threat actor",
  "nation state",
  "ttp",
  "ioc",
  "indicator of compromise",
  "patch",
  "nvd",
  "nist",
  "cvss",
  "llm security",
  "model safety",
  "jailbreak",
];

// Keywords that promote an article to "High Signal"
const HIGH_SIGNAL_KEYWORDS: string[] = [
  "cve",
  "exploit",
  "exploited",
  "actively exploited",
  "zero day",
  "0day",
  "rce",
  "remote code execution",
  "ransomware",
  "malware",
  "apt",
  "critical",
  "supply chain attack",
  "nation state",
  "backdoor",
  "rootkit",
  "privilege escalation",
];

// Extra bonus for OpenAI / Anthropic posts that have real security content
const AI_SOURCE_SECURITY_KEYWORDS: string[] = [
  "security",
  "prompt injection",
  "agent attack",
  "alignment",
  "jailbreak",
  "red team",
  "adversarial",
  "safety",
  "attack",
  "vulnerability",
];

// Ordered category inference rules — first match wins
const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: [
      "cve",
      "vulnerability",
      "vulnerabilities",
      "exploit",
      "zero day",
      "0day",
      "rce",
      "remote code execution",
      "cvss",
      "nvd",
      "patch tuesday",
    ],
    category: "CVEs",
  },
  {
    keywords: [
      "prompt injection",
      "jailbreak",
      "llm security",
      "model safety",
      "ai security",
      "llm",
      "foundation model",
      "agent attack",
    ],
    category: "AI Security",
  },
  {
    keywords: ["honeypot", "deception technology", "deception"],
    category: "Deception Technology",
  },
  {
    keywords: ["soc", "siem", "incident response", "alert fatigue", "playbook"],
    category: "SOC",
  },
  {
    keywords: [
      "kubernetes",
      "k8s",
      "container escape",
      "pod security",
      "eks",
      "aks",
      "gke",
    ],
    category: "Kubernetes Security",
  },
  {
    keywords: [
      "cloud security",
      "aws security",
      "azure security",
      "gcp security",
      "s3 bucket",
      "iam",
    ],
    category: "Cloud Security",
  },
  {
    keywords: [
      "red team",
      "pentest",
      "penetration test",
      "offensive security",
      "adversary simulation",
    ],
    category: "Red Team",
  },
  {
    keywords: ["blue team", "defender", "edr", "xdr", "detection engineering"],
    category: "Blue Team",
  },
  {
    keywords: [
      "threat intel",
      "threat intelligence",
      "apt",
      "mitre",
      "malware",
      "ransomware",
      "phishing",
      "campaign",
      "threat actor",
      "nation state",
      "supply chain",
    ],
    category: "Threat Intelligence",
  },
];

// ─── Category inference ───────────────────────────────────────────────────────

export type CategoryResult = {
  category: string;
  /** true when a keyword rule matched; false when we fell back to the source default */
  matched: boolean;
};

export function inferCategory(
  title: string,
  summary: string,
  existingCategory: string
): CategoryResult {
  const haystack = `${title} ${summary}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return { category: rule.category, matched: true };
    }
  }
  return { category: existingCategory, matched: false };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export type ScoreResult = {
  score: number;
  signal: SignalLevel;
};

export function scoreArticle(input: {
  title: string;
  summary: string;
  category: string;
  categoryMatched: boolean;
  sourceId: string;
}): ScoreResult {
  const { title, summary, category, categoryMatched, sourceId } = input;
  const titleLow = title.toLowerCase();
  const summaryLow = summary.toLowerCase();
  const fullText = `${titleLow} ${summaryLow}`;

  let score = 0;

  // Keyword matches — avoid double-counting the same keyword
  for (const kw of CYBER_KEYWORDS) {
    if (titleLow.includes(kw)) {
      score += 3;
    } else if (summaryLow.includes(kw)) {
      score += 2;
    }
  }

  // Category bonus — only when a rule actually matched
  const SECURITY_CATEGORIES = new Set([
    "CVEs",
    "AI Security",
    "Threat Intelligence",
    "Red Team",
    "Blue Team",
    "SOC",
    "Cloud Security",
    "Kubernetes Security",
    "Honeypots",
    "Deception Technology",
  ]);
  if (categoryMatched && SECURITY_CATEGORIES.has(category)) {
    score += 4;
  }

  // Source-level bonuses
  if (sourceId === "nvd-cve") {
    score += 10;
  }

  if (sourceId === "openai-blog" || sourceId === "anthropic-blog") {
    if (AI_SOURCE_SECURITY_KEYWORDS.some((kw) => fullText.includes(kw))) {
      score += 5;
    }
  }

  // Determine signal level
  const isHighSignal =
    HIGH_SIGNAL_KEYWORDS.some((kw) => fullText.includes(kw)) || score >= 15;

  const signal: SignalLevel =
    isHighSignal ? "High Signal" : score >= 3 ? "Relevant" : "General";

  return { score, signal };
}
