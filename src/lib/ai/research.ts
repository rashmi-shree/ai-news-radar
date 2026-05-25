import { InferenceClient } from "@huggingface/inference";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchBrief {
  what_happened:     string;
  why_builders_care: string;
  use_cases:         string[];
  risks:             string[];
  time_to_learn:     string;
  generated_at:      string;
}

// ─── HF client (server-side only) ────────────────────────────────────────────

let _hf: InferenceClient | null = null;
function hf(): InferenceClient {
  if (!_hf) _hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY ?? "");
  return _hf;
}

// ─── Deterministic seed helper ────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: string, offset = 0): T {
  return arr[(djb2(seed) + offset) % arr.length];
}

function pickN<T>(arr: T[], n: number, seed: string): T[] {
  const shuffled = [...arr];
  const seed_n = djb2(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed_n + i) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

// ─── Template banks ───────────────────────────────────────────────────────────

const WHY_BUILDERS_CARE: Record<string, string[]> = {
  "OpenAI": [
    "New OpenAI capabilities directly expand what you can ship — API changes, model improvements, and pricing shifts affect your stack and cost models today.",
    "OpenAI releases redefine what's possible in production AI apps. Understanding the new capabilities lets you prototype features your competitors haven't imagined yet.",
    "Every OpenAI announcement is a potential product unlock. New models, APIs, or pricing tiers mean re-evaluating your architecture and what you can offer users.",
  ],
  "Anthropic": [
    "Claude's evolving capabilities and APIs are a direct input to your product roadmap — especially if you're building reasoning-heavy features or need constitutional AI properties.",
    "Anthropic's model releases often introduce differentiated safety and reasoning properties that can open up use cases previously blocked by safety constraints.",
    "Anthropic's Claude API changes can affect builders using it for long-context tasks, document analysis, or multi-turn agents — review for breaking changes and new opportunities.",
  ],
  "Coding Agents": [
    "Coding agents are reshaping developer workflows. Understanding the architecture of these tools helps you build better agent pipelines and use existing tools strategically.",
    "The next wave of developer productivity comes from agent-native coding tools. Early understanding lets you build workflow integrations before the space consolidates.",
    "Coding agents are moving from demos to production infrastructure. The builders who understand their internals will architect more reliable agent-assisted systems.",
  ],
  "MCP": [
    "MCP is becoming the standard protocol for connecting AI agents to external tools. Implementing or consuming MCP servers positions your product in the emerging agentic ecosystem.",
    "MCP adoption means your existing APIs could become AI-native tools with minimal effort. Early MCP integration opens your product to every agent runtime that supports the protocol.",
    "Understanding MCP architecture helps you design APIs that are agent-ready from day one — a significant advantage as agentic workflows go mainstream.",
  ],
  "GitHub Repos": [
    "The repository contains patterns, architectures, or tools you can fork, adapt, or integrate directly into your stack — saving days of ground-up development.",
    "Open-source AI repos are where the field's cutting edge lives before papers are published. Studying this code gives you implementation insights that papers don't always provide.",
    "A trending AI repo signals what the community considers a solved or solvable problem — a signal for where to build products or what not to rebuild from scratch.",
  ],
  "Research Papers": [
    "This paper likely introduces techniques, benchmarks, or insights that will show up in production models within 6-12 months. Reading it now lets you anticipate what capabilities you'll soon be building on.",
    "Research-to-product cycles in AI are shortening dramatically. Papers published today often become API features or open-source libraries within months — this is your advance signal.",
    "The patterns and architectural ideas in this paper are the raw material for the next generation of AI features. Builders who engage with research maintain a meaningful technical edge.",
  ],
  "AI Startups": [
    "This startup is staking a position in the AI stack. Understanding their approach helps you assess whether they're a potential tool, partner, competitor, or acquisition target in your space.",
    "Startup activity in AI reveals where the market sees gaps. This company's approach signals a pain point worth understanding — whether you build or buy a solution.",
    "Early-stage AI companies often publish novel approaches before larger players catch up. Their product decisions are worth studying even if you never use their software directly.",
  ],
  "Benchmarks": [
    "Benchmarks directly inform model selection for your use case. This result can change which model you default to in production, affecting quality, cost, and latency.",
    "Understanding what's being measured — and what isn't — in AI benchmarks helps you select models that actually excel at your real-world task, not just at benchmark games.",
    "Benchmark results ripple through model rankings, pricing, and availability. Staying current helps you make confident infrastructure decisions before market consensus shifts.",
  ],
  "Tools": [
    "This tool may replace or augment something in your current stack. Evaluating it early lets you make informed build-vs-buy decisions and avoid technical debt.",
    "New AI tooling moves fast. A tool that gains adoption in the next 90 days can become a de facto standard you'll need to support — better to evaluate it proactively.",
    "The best AI tools reduce the time from idea to deployed feature. This release may contain APIs, libraries, or abstractions that accelerate your team's next sprint.",
  ],
  "Security": [
    "Security findings in production AI systems increasingly reveal exploitable patterns. Understanding them lets you audit your own stack proactively.",
    "Security findings in AI systems often have patterns that apply broadly. Extract the underlying attack model and evaluate it against your own architecture.",
    "Builders deploying AI in products need to understand emerging attack surfaces — data poisoning, model extraction, and input manipulation — before they impact users.",
  ],
};

const USE_CASES: Record<string, string[]> = {
  "OpenAI": [
    "Upgrade your app's AI backbone to the new model for improved accuracy or lower cost",
    "Prototype a new feature using capabilities introduced in this release",
    "Evaluate latency and quality changes against your existing evals suite",
    "Review API changelog for breaking changes and update your integration",
    "Build a comparison demo showing old vs new model performance for stakeholders",
    "Explore fine-tuning or structured output changes for production workflows",
  ],
  "Anthropic": [
    "Test Claude's new capabilities on your existing benchmark prompts",
    "Evaluate long-context improvements for document processing pipelines",
    "Build an experiment comparing Claude and GPT on your specific use case",
    "Prototype a safety-critical feature using Constitutional AI properties",
    "Review the API for new tool use or structured output capabilities",
    "Assess cost-per-token changes for production budget planning",
  ],
  "Coding Agents": [
    "Integrate the agent into your dev workflow and measure time-to-PR",
    "Build a wrapper that chains this agent with your code review pipeline",
    "Test the agent on your own codebase to identify where it adds most value",
    "Create an evals harness to benchmark agent performance on your typical tasks",
    "Explore the agent's API for embedding into your own IDE or editor extension",
    "Prototype a multi-agent workflow combining coding agents with test runners",
  ],
  "MCP": [
    "Wrap your existing API endpoints as an MCP server to make them agent-accessible",
    "Build an MCP client integration so your product can consume external MCP tools",
    "Create an MCP server for your database schema to enable natural language queries",
    "Add MCP support to your internal tooling to connect it to AI agent workflows",
    "Prototype an agent that orchestrates multiple MCP tools for a complex task",
    "Publish a public MCP server for your product's core functionality",
  ],
  "GitHub Repos": [
    "Fork the repository and adapt the core approach to your specific use case",
    "Study the architecture and apply the patterns to your existing system",
    "Integrate the library as a dependency and prototype a minimal end-to-end flow",
    "Run the included benchmarks against your own data to evaluate fit",
    "Contribute a use case or adapter that extends the project to your domain",
    "Use it as a reference implementation while building your own version",
  ],
  "Research Papers": [
    "Implement the paper's core technique on a toy dataset to validate your understanding",
    "Identify open-source implementations and benchmark them on your data",
    "Extract the key architectural insight and evaluate if it improves your current model",
    "Write an internal note summarizing applicability to your team's roadmap",
    "Monitor for follow-up implementations; set a 30-day reminder to revisit",
    "Prototype the proposed approach using available HuggingFace models as a proxy",
  ],
  "AI Startups": [
    "Sign up for their beta or waitlist to evaluate the product early",
    "Map their solution to your current pain points and score the fit",
    "Book a demo and prepare a set of your real use cases to evaluate against",
    "Assess their API or SDK for potential integration into your stack",
    "Evaluate their pricing model against your usage patterns",
    "Identify if their approach is patent-protected or replicable",
  ],
  "Benchmarks": [
    "Re-run your model selection decision using the updated benchmark results",
    "Test your production model on the same tasks to see where you stand",
    "Use the benchmark dataset as a new eval for your CI/CD pipeline",
    "Share the results with your team to align on model upgrade decisions",
    "Evaluate whether the benchmark tasks overlap with your real user queries",
    "Build a custom leaderboard focused on the specific tasks that matter to you",
  ],
  "Tools": [
    "Install and run a 30-minute proof-of-concept on your most painful workflow",
    "Compare the tool's performance against your current solution on 5 key tasks",
    "Check for an SDK or API that enables programmatic integration",
    "Evaluate the licensing terms for production and commercial use",
    "Test integration with your existing stack — CI, editor, or orchestration layer",
    "Build a simple wrapper and get a teammate to stress-test it",
  ],
  "Security": [
    "Audit your system for the described attack pattern",
    "Review your AI input validation and output filtering against this finding",
    "Update your security documentation with the new attack surface",
    "Test the reported pattern against your staging environment",
    "Review third-party dependencies for exposure to the described issue",
    "Add detection and alerting for the described pattern to your monitoring",
  ],
};

const RISKS: Record<string, string[]> = {
  "OpenAI": [
    "API breaking changes may require prompt engineering updates across your integration",
    "New model may perform differently on edge cases your system relies on — run your evals",
    "Pricing changes could significantly impact cost at scale",
    "Increased platform dependence: OpenAI deprecation schedules can force unplanned migrations",
    "New capabilities may introduce unexpected model behaviours without explicit fine-tuning",
  ],
  "Anthropic": [
    "Claude's safety filters may reject inputs that previously worked — test your prompts",
    "Context window changes can break long-document pipelines in subtle ways",
    "Anthropic's pricing and model roadmap can shift with limited notice",
    "Constitutional AI guardrails may conflict with specific production use cases",
    "API rate limits and capacity may affect reliability during launch periods",
  ],
  "Coding Agents": [
    "Agents can confidently produce plausible-but-wrong code — always review output",
    "Integration into existing CI/CD adds a new failure mode to audit",
    "Security risk if the agent has write access to production systems without review gates",
    "Dependency on a third-party agent runtime adds platform and availability risk",
    "Cost can scale unexpectedly if the agent loops or calls APIs excessively",
  ],
  "MCP": [
    "Protocol is evolving — early implementations may require refactoring as the spec matures",
    "Exposing internal tools via MCP creates new attack surfaces that need authentication",
    "Debugging agent interactions across MCP boundaries is significantly harder than direct API calls",
    "Ecosystem fragmentation: not all agent runtimes implement MCP identically",
    "Data leakage risk if MCP servers expose more context than intended to agents",
  ],
  "GitHub Repos": [
    "Open-source licensing may restrict commercial use — check the LICENSE file carefully",
    "Maintenance risk: popular repos can be abandoned, especially early-stage AI projects",
    "Security risk: community-maintained code may contain unreviewed vulnerabilities",
    "Performance on your data may differ significantly from reported benchmarks",
    "Dependency chain can introduce incompatible packages into your environment",
  ],
  "Research Papers": [
    "Reproducibility gap: published results often don't transfer to different datasets or settings",
    "Compute requirements may be impractical at your scale or budget",
    "Implementation complexity often exceeds what the paper conveys — budget exploration time",
    "The technique may be patented or require licensing for commercial use",
    "Results may be benchmark-optimised and not representative of real-world performance",
  ],
  "AI Startups": [
    "Startup risk: company may pivot, be acquired, or shut down without notice",
    "Vendor lock-in if the product doesn't provide data export or open APIs",
    "Early-stage products may have reliability or scalability issues in production",
    "Pricing can change dramatically post-funding or pre-IPO",
    "Limited track record makes it difficult to assess long-term viability",
  ],
  "Benchmarks": [
    "Benchmark overfitting: models may be tuned to specific benchmarks, not real tasks",
    "Task distribution may not match your production queries — validate on your own data",
    "Leadership changes often reflect benchmark-specific optimisations that don't generalise",
    "New benchmarks take time for the community to validate and critique",
    "Cost and latency are rarely captured in accuracy-only benchmarks",
  ],
  "Tools": [
    "Early-version tools may have rough edges, limited documentation, or breaking changes",
    "Adoption costs: onboarding, integration, and team training time can exceed the payoff",
    "Vendor lock-in if tool uses proprietary formats or APIs without export options",
    "Security audit required before granting production system access",
    "Performance may not scale to your production workload without significant configuration",
  ],
  "Security": [
    "Fixes take time to deploy — your systems may be exposed in the interim",
    "Counter-measures may conflict with existing functionality or require significant refactoring",
    "Surface-level fixes without root-cause analysis leave the underlying issue open",
    "Public disclosure shortens response windows — act quickly once you've assessed exposure",
    "Dependent systems and downstream integrations may inherit the same issue",
  ],
};

const TIME_TO_LEARN: Record<string, string> = {
  "Research Papers":  "4–8 hours (skim: 1 hour, deep read + code: 4–8 hours)",
  "Benchmarks":       "1–2 hours (results: 15 min, methodology + reproduce: 1–2 hours)",
  "Coding Agents":    "2–4 hours (docs + hands-on trial: 2–4 hours)",
  "MCP":              "2–3 hours (spec read: 45 min, build a basic server: 2 hours)",
  "GitHub Repos":     "1–4 hours (README + run demo: 1 hour, deep dive: 3–4 hours)",
  "Tools":            "30 min – 2 hours (install + PoC: 30 min, full eval: 2 hours)",
  "OpenAI":           "15–30 min (changelog + API diff: 15 min, update integration: 30 min)",
  "Anthropic":        "15–30 min (announcement: 10 min, test your prompts: 20 min)",
  "AI Startups":      "15–20 min (product overview + demo: 15 min)",
  "Security":         "1–2 hours (understand the issue: 30 min, audit + remediate: 1–2 hours)",
};

// ─── Template-based generation ────────────────────────────────────────────────

function buildTemplates(article: {
  title:       string;
  summary:     string;
  category:    string;
  ai_summary?: string;
}): ResearchBrief {
  const { title, summary, category, ai_summary } = article;
  const seed = title;

  const what_happened = ai_summary?.trim() || summary.trim();

  const whyBank = WHY_BUILDERS_CARE[category] ?? WHY_BUILDERS_CARE["Tools"]!;
  const why_builders_care = pick(whyBank, seed);

  const ucBank = USE_CASES[category] ?? USE_CASES["Tools"]!;
  const use_cases = pickN(ucBank, 3, seed);

  const riskBank = RISKS[category] ?? RISKS["Tools"]!;
  const risks = pickN(riskBank, 3, seed);

  const time_to_learn = TIME_TO_LEARN[category] ?? "1–2 hours";

  return {
    what_happened,
    why_builders_care,
    use_cases,
    risks,
    time_to_learn,
    generated_at: new Date().toISOString(),
  };
}

// ─── HuggingFace-enhanced generation ─────────────────────────────────────────

const BRIEF_PROMPT = (article: { title: string; summary: string; category: string }) => `
You are a research assistant for AI builders. Given the article below, generate a concise builder research brief as a JSON object with exactly these keys:
- "what_happened": 1-2 sentence factual summary
- "why_builders_care": 1-2 sentences on builder relevance
- "use_cases": array of exactly 3 short, concrete action items starting with a verb
- "risks": array of exactly 3 short caveats or risks
- "time_to_learn": realistic time estimate string like "1-2 hours"

Article title: ${article.title}
Category: ${article.category}
Summary: ${article.summary.slice(0, 600)}

Respond with ONLY valid JSON, no markdown, no explanation.`.trim();

function parseJson(text: string): Partial<ResearchBrief> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Partial<ResearchBrief>;
  } catch {
    return null;
  }
}

export async function generateResearchBrief(article: {
  title:       string;
  summary:     string;
  category:    string;
  ai_summary?: string;
}): Promise<ResearchBrief> {
  const base = buildTemplates(article);

  if (!process.env.HUGGINGFACE_API_KEY) return base;

  try {
    const client = hf();
    const response = await client.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [{ role: "user", content: BRIEF_PROMPT(article) }],
      max_tokens: 600,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = parseJson(text);

    if (
      parsed &&
      typeof parsed.what_happened     === "string" &&
      typeof parsed.why_builders_care === "string" &&
      Array.isArray(parsed.use_cases) &&
      Array.isArray(parsed.risks)     &&
      typeof parsed.time_to_learn     === "string"
    ) {
      return {
        what_happened:     parsed.what_happened.trim(),
        why_builders_care: parsed.why_builders_care.trim(),
        use_cases:         (parsed.use_cases as string[]).slice(0, 5).map((s) => s.trim()),
        risks:             (parsed.risks as string[]).slice(0, 5).map((s) => s.trim()),
        time_to_learn:     parsed.time_to_learn.trim(),
        generated_at:      new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn("[RESEARCH] HF generation failed, using templates:", (err as Error).message);
  }

  return base;
}
