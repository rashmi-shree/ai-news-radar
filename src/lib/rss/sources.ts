export type SourceType =
  | "release"
  | "tool"
  | "repo"
  | "paper"
  | "startup"
  | "benchmark"
  | "security";

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  source_type: SourceType;
  /**
   * When true, items from this source pass through the keyword scoring gate
   * before being included in the feed. Set false for focused sources where
   * all content is already on-topic.
   */
  requiresFilter: boolean;
};

/**
 * Derives a source_type from an article's inferred category.
 * Used as a fallback when a custom fetcher doesn't declare a source_type.
 */
export function inferSourceType(category: string): SourceType {
  switch (category) {
    case "Research Papers": return "paper";
    case "GitHub Repos":    return "repo";
    case "AI Startups":     return "startup";
    case "Benchmarks":      return "benchmark";
    case "Security":        return "security";
    case "OpenAI":
    case "Anthropic":       return "release";
    case "Coding Agents":
    case "MCP":
    case "Tools":           return "tool";
    default:                return "tool";
  }
}

export const sources: NewsSource[] = [
  // ── Official AI lab blogs ─────────────────────────────────────────────────
  {
    id:             "openai-blog",
    name:           "OpenAI Blog",
    url:            "https://openai.com/news/rss.xml",
    category:       "OpenAI",
    source_type:    "release",
    requiresFilter: false,
  },
  // Anthropic: fetched by fetchAnthropicBlog.ts (no public RSS feed)

  // ── AI research ───────────────────────────────────────────────────────────
  {
    id:             "papers-with-code",
    name:           "Papers with Code",
    url:            "https://paperswithcode.com/latest.rss",
    category:       "Research Papers",
    source_type:    "paper",
    requiresFilter: false,
  },
  {
    id:             "huggingface-blog",
    name:           "Hugging Face Blog",
    url:            "https://huggingface.co/blog/feed.xml",
    category:       "Research Papers",
    source_type:    "paper",
    requiresFilter: true,
  },

  // ── Hacker News (AI-filtered) ─────────────────────────────────────────────
  {
    id:             "hacker-news-ai",
    name:           "Hacker News · AI",
    url:            "https://hnrss.org/newest?q=LLM+OpenAI+Claude+Cursor+agents+benchmark&points=10&count=25",
    category:       "Tools",
    source_type:    "tool",
    requiresFilter: false, // hnrss query already filters for AI relevance
  },

  // ── AI newsletter digest ──────────────────────────────────────────────────
  {
    id:             "tldr-ai",
    name:           "TLDR AI",
    url:            "https://tldr.tech/api/rss/ai",
    category:       "Tools",
    source_type:    "tool",
    requiresFilter: false,
  },

  // ── Product launches ──────────────────────────────────────────────────────
  {
    id:             "product-hunt-ai",
    name:           "Product Hunt · AI",
    url:            "https://www.producthunt.com/feed?category=artificial-intelligence",
    category:       "AI Startups",
    source_type:    "startup",
    requiresFilter: false,
  },

  // ── General tech (broad keyword filter applied) ───────────────────────────
  {
    id:             "hacker-news",
    name:           "Hacker News",
    url:            "https://hnrss.org/frontpage",
    category:       "Tools",
    source_type:    "tool",
    requiresFilter: true,
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    id:             "the-hacker-news",
    name:           "The Hacker News",
    url:            "https://feeds.feedburner.com/TheHackersNews",
    category:       "Security",
    source_type:    "security",
    requiresFilter: false,
  },
  {
    id:             "krebs-on-security",
    name:           "Krebs on Security",
    url:            "https://krebsonsecurity.com/feed/",
    category:       "Security",
    source_type:    "security",
    requiresFilter: false,
  },
  {
    id:             "cisa-advisories",
    name:           "CISA Advisories",
    url:            "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    category:       "Security",
    source_type:    "security",
    requiresFilter: false,
  },
];
