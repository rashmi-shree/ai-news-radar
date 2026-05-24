export type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  /**
   * When true, items from this source are run through the cybersecurity
   * keyword scoring gate before being included in the feed.
   * Set false for sources that are already security-focused.
   */
  requiresFilter: boolean;
};

export const sources: NewsSource[] = [
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    url: "https://openai.com/news/rss.xml",
    category: "AI Security",
    requiresFilter: false,
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    url: "https://hnrss.org/frontpage",
    category: "Threat Intelligence",
    requiresFilter: true, // general tech aggregator — keyword filter required
  },
  {
    id: "the-hacker-news",
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    category: "Threat Intelligence",
    requiresFilter: false, // dedicated cybersecurity publication
  },
  {
    id: "krebs-on-security",
    name: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    category: "Threat Intelligence",
    requiresFilter: false, // security journalism — all content is relevant
  },
  {
    id: "cisa-advisories",
    name: "CISA Advisories",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    category: "CVEs",
    requiresFilter: false, // government advisories — all content is relevant
  },
  // Anthropic: no public RSS feed. https://www.anthropic.com/news is HTML-only.
  // NVD CVE RSS feed retired. CVEs fetched via fetchNvdCves() (NVD 2.0 REST API).
];
