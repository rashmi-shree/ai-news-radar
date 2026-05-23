export type RiskLevel = "low" | "medium" | "high";

export type SummaryResult = {
  summary: string;
  whyItMatters: string;
  riskLevel: RiskLevel;
  humor?: string;
  readTime: string;
};

export type ArticleInput = {
  title: string;
  summary: string;
  category: string;
  source: string;
};
