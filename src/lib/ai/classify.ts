import type { RiskLevel } from "./types";

const HIGH_RISK_KEYWORDS: string[] = [
  "cve",
  "exploit",
  "exploited",
  "actively exploited",
  "ransomware",
  "breach",
  "data breach",
  "supply chain",
  "supply chain attack",
  "prompt injection",
  "zero day",
  "zero-day",
  "0day",
  "active attack",
  "rce",
  "remote code execution",
  "critical vulnerability",
  "wormable",
  "unauthenticated",
];

const MEDIUM_RISK_KEYWORDS: string[] = [
  "red team",
  "ai safety",
  "security update",
  "research",
  "bug bounty",
  "vulnerability",
  "vulnerabilities",
  "penetration test",
  "pentest",
  "phishing",
  "malware",
  "threat actor",
  "privilege escalation",
  "lateral movement",
  "credential",
];

/**
 * Keyword-based risk classifier — no API required.
 * Evaluated in order; first tier match wins.
 */
export function classifyRisk(article: {
  title: string;
  summary: string;
}): RiskLevel {
  const text = `${article.title} ${article.summary}`.toLowerCase();

  if (HIGH_RISK_KEYWORDS.some((kw) => text.includes(kw))) return "high";
  if (MEDIUM_RISK_KEYWORDS.some((kw) => text.includes(kw))) return "medium";
  return "low";
}
