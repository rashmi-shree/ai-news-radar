export type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  /** When true, items are filtered by cybersecurity keywords before display. */
  requiresFilter: boolean;
};

export const sources: NewsSource[] = [
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    category: "AI Security",
    requiresFilter: false,
  },
  {
    id: "anthropic-blog",
    name: "Anthropic Blog",
    url: "https://www.anthropic.com/rss.xml",
    category: "AI Security",
    requiresFilter: false,
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    url: "https://news.ycombinator.com/rss",
    category: "Threat Intelligence",
    requiresFilter: true,
  },
  {
    id: "nvd-cve",
    name: "NVD CVE Feed",
    url: "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml",
    category: "CVEs",
    requiresFilter: false,
  },
];
