import type { RiskLevel } from "./types";

// ─── Risk level rules ─────────────────────────────────────────────────────────
// Evaluated in order — first match wins.

export const RISK_RULES: Array<{ keywords: string[]; risk: RiskLevel }> = [
  {
    keywords: [
      "cve",
      "exploit",
      "exploited",
      "actively exploited",
      "ransomware",
      "zero day",
      "0day",
      "rce",
      "remote code execution",
      "critical vulnerability",
      "critical flaw",
      "wormable",
      "unauthenticated",
    ],
    risk: "high",
  },
  {
    keywords: [
      "prompt injection",
      "jailbreak",
      "agent attack",
      "adversarial",
      "model exfiltration",
      "supply chain",
      "privilege escalation",
      "credential",
      "lateral movement",
      "phishing",
      "malware",
      "apt",
      "threat actor",
    ],
    risk: "medium",
  },
  {
    keywords: [
      "bug bounty",
      "pentest",
      "security research",
      "disclosure",
      "proof of concept",
      "detection",
      "hunting",
    ],
    risk: "low",
  },
];

// ─── Why It Matters templates ─────────────────────────────────────────────────
// Picked deterministically by title hash — no randomness between renders.

export const WHY_IT_MATTERS: Record<string, string[]> = {
  OpenAI: [
    "New capabilities from OpenAI can unlock features in your product or shift the competitive baseline. Evaluate how this changes your architecture.",
    "If you're building on the OpenAI API, this update may affect rate limits, pricing, context windows, or model behavior — test your integration.",
    "Benchmark against your current implementation. New models often change the cost/performance tradeoff you've optimized around.",
  ],
  Anthropic: [
    "Claude updates often come with improved instruction-following and reduced refusals. Consider testing on your hardest prompts.",
    "If you're using Claude via API, check the changelog for breaking changes to tool use, system prompt handling, or token limits.",
    "Anthropic's safety research often previews what will become industry standard — stay ahead of alignment constraints in your product.",
  ],
  "Coding Agents": [
    "A new coding tool or agent update could meaningfully accelerate your development loop. Run a quick benchmark on your own codebase.",
    "Adoption in your team could compound quickly — even a 10% productivity boost adds up. Worth a 30-minute pilot.",
    "If you're building dev tools yourself, this is a signal of where the market is moving. Integrate or differentiate accordingly.",
  ],
  MCP: [
    "MCP is becoming the standard for connecting models to external tools. Early adoption means your integrations will be compatible by default.",
    "If you're building AI agents, adding MCP support now saves significant refactoring later as the ecosystem standardizes.",
    "New MCP server releases often unlock integrations with popular services. Check whether your workflow could benefit directly.",
  ],
  "GitHub Repos": [
    "High-traction repos often signal emerging tools or frameworks that could save weeks of implementation time. Fork and experiment.",
    "Open source releases from major labs often contain reference implementations worth studying before building your own.",
    "Trending repos can indicate what the developer community is converging on — useful signal for picking dependencies.",
  ],
  "Research Papers": [
    "This paper may describe a technique directly applicable to your current engineering challenges. Skim the abstract and results section.",
    "Reproductions of research findings often appear as open-source libraries within weeks. Watch for an implementation drop.",
    "If a competitor could read this paper and ship a feature before you, that's a signal to prioritize evaluation.",
  ],
  "AI Startups": [
    "New entrants and funding rounds reshape the competitive landscape. Understand what problem they're solving and whether it overlaps with yours.",
    "Startup launches often surface new approaches worth borrowing. Check their technical blog or GitHub for implementation details.",
    "Series A/B funding signals the market is validating a category — useful for roadmap prioritization and positioning.",
  ],
  Benchmarks: [
    "Benchmark results directly affect which model you should use for a given task. Re-run your evaluations against the new leader.",
    "If your product relies on a specific capability, this benchmark data gives you an objective basis for model selection.",
    "Leaderboard shifts often precede pricing changes and API availability — plan your model strategy accordingly.",
  ],
  Tools: [
    "New SDK or API release may expose capabilities you've been waiting on. Check the changelog and update your integration plan.",
    "Framework updates can reduce boilerplate in your stack. A version bump today might eliminate hundreds of lines of custom code.",
    "Early adoption of popular tools builds expertise before they become table stakes — useful for hiring and product differentiation.",
  ],
  Security: [
    "Security findings in AI systems often have patterns that apply broadly. Audit your input handling and output filtering against the reported pattern.",
    "Data exposure in AI infrastructure is increasingly common. Review your API key management and data handling practices.",
    "Security findings in models or frameworks you depend on may require updates or architectural changes — assess your exposure.",
  ],
};

export const WHY_IT_MATTERS_DEFAULT: string[] = [
  "Evaluate how this development affects your current build and roadmap.",
  "Builders and researchers should assess whether this creates an opportunity or changes an assumption in their work.",
  "Stay current — the AI landscape moves fast and early awareness compounds into a meaningful advantage.",
];

// ─── Humor pools ──────────────────────────────────────────────────────────────

export const HUMOR: Record<RiskLevel, string[]> = {
  high: [
    "The model dropped, the benchmark is broken, and your context window just got longer. Good morning.",
    "New SOTA. Your architecture: legacy.",
    "Raised $100M. Still has no revenue. This is fine.",
    "The paper came out Friday. The replication came out Saturday. The startup came out Sunday.",
    "Another model, another eval dataset, another claim of AGI. Please wait for the system card.",
    "Ships in two weeks. (Weeks: undefined.)",
    "Context window: 1M tokens. Attention: decreasing.",
  ],
  medium: [
    "Your AI intern trusted user input. Again.",
    "Turns out 'helpful and harmless' is harder than it looks.",
    "Guardrails: enabled. Creativity: finding a way around them.",
    "The model passed alignment eval. The prompt engineer didn't get that memo.",
    "It's not a jailbreak, it's 'creative prompt optimization'.",
    "The API worked in the demo. Naturally.",
    "Fine-tuned on a proprietary dataset. Dataset: vibes.",
  ],
  low: [
    "Someone opened an issue at 2am with detailed steps to reproduce. We see you.",
    "100 stars on GitHub. 99 of them are the founder's alt accounts.",
    "Bug filed. Sitting in backlog. Priority: some day.",
    "Low impact today. 'Wait, this chains with what?' tomorrow.",
    "Responsibly disclosed. Fix shipped. Changelog says 'minor improvements'.",
  ],
};
