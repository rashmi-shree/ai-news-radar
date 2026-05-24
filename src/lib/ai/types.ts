export type RiskLevel = "high" | "medium" | "low";

export type SummaryResult = {
  ai_summary: string;
  why_it_matters: string;
  risk_level: RiskLevel;
  humor?: string;
  readTime?: string;
};

export type ArticleInput = {
  title: string;
  summary: string;
  category: string;
  source: string;
};
