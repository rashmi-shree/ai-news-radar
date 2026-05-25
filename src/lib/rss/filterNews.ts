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
  "openai",
  "anthropic",
  "claude",
  "gpt",
  "llm",
  "model",
  "ai",
  "agent",
  "mcp",
  "model context protocol",
  "benchmark",
  "eval",
  "evaluation",
  "github",
  "open source",
  "coding",
  "research",
  "startup",
  "funding",
  "api",
  "sdk",
  "framework",
  "release",
  "security",
  "vulnerability",
  "exploit",
  "jailbreak",
  "prompt injection",
  "arxiv",
  "paper",
  "leaderboard",
  "fine-tuning",
  "rag",
  "multimodal",
  "cursor",
  "copilot",
  "devin",
  "code generation",
];

// Keywords that promote an article to "High Signal"
const HIGH_SIGNAL_KEYWORDS: string[] = [
  "new model",
  "released",
  "launches",
  "announced",
  "breakthrough",
  "raises",
  "series a",
  "series b",
  "benchmark",
  "record",
  "jailbreak",
  "exploit",
  "vulnerability",
  "critical",
  "gpt-5",
  "claude",
  "gemini",
];

// Relevance keywords for AI/builder source articles
const AI_SOURCE_SECURITY_KEYWORDS: string[] = [
  "model",
  "agent",
  "benchmark",
  "research",
  "safety",
  "alignment",
  "api",
  "release",
  "launch",
  "open source",
];

// Ordered category inference rules — first match wins
const CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ["openai", "gpt-4", "gpt-5", "chatgpt", "o1 ", "o3 ", "o4 ", "sora", "dall-e"],
    category: "OpenAI",
  },
  {
    keywords: ["anthropic", "claude 3", "claude 4", "claude sonnet", "claude haiku", "claude opus"],
    category: "Anthropic",
  },
  {
    keywords: [
      "cursor", "copilot", "devin", "coding agent", "ai coding", "aider",
      "code generation", "autocomplete", "codex", "windsurf", "codeium",
    ],
    category: "Coding Agents",
  },
  {
    keywords: ["model context protocol", " mcp ", "mcp server", "mcp tool", "function calling", "tool use"],
    category: "MCP",
  },
  {
    keywords: [
      "github repo", "open-source", "open source release", "hugging face",
      "trending repo", "stars on github", "forked",
    ],
    category: "GitHub Repos",
  },
  {
    keywords: ["arxiv", "research paper", "preprint", "we present", "we propose", "survey paper", "published paper"],
    category: "Research Papers",
  },
  {
    keywords: ["startup", "series a", "series b", "seed round", "raises $", "raised $", "valuation", "founded"],
    category: "AI Startups",
  },
  {
    keywords: [
      "benchmark", "leaderboard", "mmlu", "humaneval", "swe-bench", "lmsys",
      "elo score", "evals", "evaluation suite",
    ],
    category: "Benchmarks",
  },
  {
    keywords: [
      "jailbreak", "prompt injection", "adversarial", "vulnerability",
      "exploit", "cve", "security breach", "data breach",
    ],
    category: "Security",
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
  const AI_CATEGORIES = new Set([
    "OpenAI",
    "Anthropic",
    "Coding Agents",
    "MCP",
    "GitHub Repos",
    "Research Papers",
    "AI Startups",
    "Benchmarks",
    "Tools",
    "Security",
  ]);
  if (categoryMatched && AI_CATEGORIES.has(category)) {
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
