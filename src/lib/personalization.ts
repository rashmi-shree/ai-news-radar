import type { NewsItem } from "@/components/NewsCard";

// ─── Topic metadata ────────────────────────────────────────────────────────────

/** Maps topic ID → display label */
export const TOPIC_LABELS: Record<string, string> = {
  "openai":          "OpenAI",
  "anthropic":       "Anthropic",
  "coding-agents":   "Coding Agents",
  "mcp":             "MCP",
  "github-repos":    "GitHub Repos",
  "research-papers": "Research Papers",
  "ai-startups":     "AI Startups",
  "benchmarks":      "Benchmarks",
  "tools":           "Tools",
  "security":        "Security",
  // Extra topics used in settings / DB trigger defaults
  "ai-agents":       "AI Agents",
  "open-source":     "Open Source",
};

/**
 * Maps display label → topic ID.
 * Automatically derived from TOPIC_LABELS so the two maps stay in sync.
 * Enables the feed scorer to accept either IDs ("mcp") or labels ("MCP").
 */
export const LABEL_TO_TOPIC_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_LABELS).map(([id, label]) => [label, id])
);

/**
 * Normalises a topic string to its canonical ID.
 * Accepts both IDs ("mcp") and labels ("MCP") from the database.
 */
export function normalizeTopic(topic: string): string {
  return LABEL_TO_TOPIC_ID[topic] ?? topic;
}

/** Maps onboarding topic ID → article category string */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  "openai":          "OpenAI",
  "anthropic":       "Anthropic",
  "coding-agents":   "Coding Agents",
  "mcp":             "MCP",
  "github-repos":    "GitHub Repos",
  "research-papers": "Research Papers",
  "ai-startups":     "AI Startups",
  "benchmarks":      "Benchmarks",
  "tools":           "Tools",
  "security":        "Security",
  "ai-agents":       "Coding Agents",  // closest category match
  "open-source":     "GitHub Repos",   // closest category match
};

/** Keywords to match against title + summary for each topic */
export const TOPIC_KEYWORDS: Record<string, string[]> = {
  "openai":          ["openai", "gpt-4", "gpt-5", "chatgpt", "o1", "o3", "o4", "sora", "dall-e", "gpt"],
  "anthropic":       ["anthropic", "claude", "sonnet", "haiku", "opus", "constitutional ai"],
  "coding-agents":   ["cursor", "copilot", "devin", "coding agent", "ai coding", "aider", "code generation", "autocomplete", "codex"],
  "mcp":             ["mcp", "model context protocol", "tool use", "function calling", "tool call"],
  "github-repos":    ["github", "open source", "repository", "open-source", "hugging face", "stars"],
  "research-papers": ["arxiv", "research paper", "paper", "preprint", "study", "published", "survey", "findings"],
  "ai-startups":     ["startup", "funding", "series a", "series b", "raised", "valuation", "seed round", "launch"],
  "benchmarks":      ["benchmark", "eval", "evaluation", "leaderboard", "mmlu", "humaneval", "swe-bench", "lmsys", "elo"],
  "tools":           ["api", "sdk", "framework", "library", "plugin", "integration", "release", "update", "open source"],
  "security":        ["security", "vulnerability", "exploit", "jailbreak", "prompt injection", "adversarial", "breach"],
  "ai-agents":       ["agent framework", "autonomous agent", "agentic", "multi-agent", "langchain", "autogen", "crewai", "swarm", "agent loop"],
  "open-source":     ["open source", "open-source", "oss", "community", "contributors", "fork", "mit license", "apache license"],
};

/** Topics where AI-adjacent content earns an extra overlap bonus */
const AI_OVERLAP_TOPICS = new Set([
  "openai", "anthropic", "coding-agents", "research-papers", "ai-agents",
]);

// ─── Scoring ───────────────────────────────────────────────────────────────────

export function computePersonalScore(
  item: Pick<NewsItem, "title" | "summary" | "category">,
  interests: string[]
): number {
  if (interests.length === 0) return 0;

  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  let score = 0;

  for (const rawTopic of interests) {
    // Accept both IDs and labels from the database
    const topic = LABEL_TO_TOPIC_ID[rawTopic] ?? rawTopic;

    // +3 exact category match
    if (TOPIC_TO_CATEGORY[topic] === item.category) {
      score += 3;
    }

    // +2 keyword match in title/summary
    const keywords = TOPIC_KEYWORDS[topic] ?? [];
    if (keywords.some((kw) => haystack.includes(kw))) {
      score += 2;
    }

    // +1 AI builder content overlap
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

  for (const rawTopic of interests) {
    // Accept both IDs and labels
    const topic   = LABEL_TO_TOPIC_ID[rawTopic] ?? rawTopic;
    const label   = TOPIC_LABELS[topic] ?? rawTopic;
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

export function sortPersonalized<T extends NewsItem>(
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
