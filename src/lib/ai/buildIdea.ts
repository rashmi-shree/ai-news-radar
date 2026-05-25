import { InferenceClient } from "@huggingface/inference";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface BuildIdea {
  idea_name:      string;
  problem_solved: string;
  tech_stack:     string[];
  difficulty:     Difficulty;
  mvp_scope:      string[];
  time_estimate:  string;
  generated_at:   string;
}

// ─── HF client (server-side only) ─────────────────────────────────────────────

let _hf: InferenceClient | null = null;
function hf(): InferenceClient {
  if (!_hf) _hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY ?? "");
  return _hf;
}

// ─── Deterministic helpers ────────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: string, offset = 0): T {
  return arr[(djb2(seed) + offset) % arr.length];
}

function pickN<T>(arr: T[], n: number, seed: string): T[] {
  const copy = [...arr];
  const s = djb2(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (s + i) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ─── Template banks ───────────────────────────────────────────────────────────

const IDEA_NAMES: Record<string, string[]> = {
  "OpenAI": [
    "AI-powered writing assistant using the latest model",
    "Cost-aware GPT routing layer for multi-model apps",
    "Structured output extractor with schema validation",
    "Conversational UI boilerplate with streaming support",
    "Prompt version manager and eval harness",
  ],
  "Anthropic": [
    "Long-document Q&A engine using Claude's context window",
    "Constitutional AI content moderation middleware",
    "Multi-turn research agent with Claude as the backbone",
    "Claude-powered code review bot for PRs",
    "Privacy-first data extraction pipeline using Claude",
  ],
  "Coding Agents": [
    "Autonomous test-writing agent for your codebase",
    "PR description generator with diff analysis",
    "AI-assisted refactoring tool with rollback safety",
    "On-call debugging agent that triages error logs",
    "Code migration tool powered by a coding agent",
  ],
  "MCP": [
    "MCP server exposing your internal database to agents",
    "Personal productivity MCP server (calendar + tasks)",
    "MCP wrapper for popular SaaS APIs",
    "GitHub MCP integration for AI-native dev workflows",
    "Custom MCP server for domain-specific data sources",
  ],
  "GitHub Repos": [
    "SaaS product built on top of this open-source foundation",
    "Hosted API service wrapping the core library",
    "Drag-and-drop UI over the library's core primitives",
    "Multi-tenant deployment of the repository with auth",
    "Developer tool that extends the repo with plugins",
  ],
  "Research Papers": [
    "Production implementation of the paper's core technique",
    "Benchmark playground for experimenting with the method",
    "API service exposing the paper's algorithm as an endpoint",
    "Educational interactive demo of the research findings",
    "Fine-tuning pipeline using the paper's approach",
  ],
  "AI Startups": [
    "Open-source alternative targeting the same pain point",
    "Integration layer connecting this product to your stack",
    "Niche spin-off for a specific vertical the startup ignores",
    "Developer SDK wrapping the startup's public API",
    "Competitor analysis tool that benchmarks against this startup",
  ],
  "Benchmarks": [
    "Custom eval harness for your production use case",
    "Model selection CLI that runs benchmarks on your data",
    "Leaderboard dashboard for internal model comparisons",
    "Cost-performance optimiser using benchmark data",
    "Automated model regression detector for CI pipelines",
  ],
  "Tools": [
    "Workflow automation combining this tool with your stack",
    "Self-hosted version of the tool with custom extensions",
    "VS Code extension wrapping the tool's core features",
    "CLI wrapper with team collaboration features",
    "SaaS dashboard providing analytics on top of the tool",
  ],
  "Security": [
    "AI prompt injection scanner for production LLM apps",
    "Automated security audit tool for AI-powered apps",
    "Input validation middleware for LLM API calls",
    "AI robustness testing harness for production LLM apps",
    "Security monitoring dashboard for AI deployments",
  ],
};

const PROBLEM_SOLVED: Record<string, string[]> = {
  "OpenAI": [
    "Developers lack a production-ready starting point for new OpenAI features, spending days on boilerplate before writing real product logic.",
    "Teams deploying GPT-4 in production have no reliable way to control costs as usage scales unpredictably across features.",
    "Extracting structured data from LLMs is error-prone without schema validation, causing silent failures in downstream systems.",
  ],
  "Anthropic": [
    "Processing long documents with LLMs is slow and expensive; most solutions chunk documents and lose context across chunks.",
    "AI content moderation systems are hard to tune without a principled framework, leading to either over-blocking or under-blocking.",
    "Multi-step research tasks require manual orchestration; there's no reliable way to chain Claude calls with memory and tool use.",
  ],
  "Coding Agents": [
    "Writing tests is the most skipped part of development; an agent that generates tests on every commit removes the bottleneck.",
    "PR descriptions are consistently under-written, making code reviews slower and harder for reviewers to understand intent.",
    "Migrating legacy codebases between frameworks is slow and error-prone; agents can automate the mechanical parts reliably.",
  ],
  "MCP": [
    "AI agents can't access live data from internal tools, limiting them to stale context and reducing usefulness in real workflows.",
    "Building integrations between AI assistants and existing systems requires custom code for each combination of tools.",
    "Developers spend significant time writing boilerplate to expose APIs to AI agents rather than building the core experience.",
  ],
  "GitHub Repos": [
    "The repository solves a hard technical problem but lacks a polished product layer — onboarding, pricing, and support.",
    "The library is powerful but requires significant expertise to deploy; a hosted version lowers the barrier dramatically.",
    "Core functionality is solid but there's no UI, leaving non-technical users unable to benefit from the capability.",
  ],
  "Research Papers": [
    "The technique is only available as a research prototype; a production-ready implementation doesn't exist yet.",
    "Practitioners can't benchmark the approach against their own data without re-implementing the method from scratch.",
    "The paper's insights are not accessible to builders without a deep ML background; an abstracted API changes that.",
  ],
  "AI Startups": [
    "The startup serves the enterprise market; an open-source or indie-friendly alternative doesn't exist for smaller teams.",
    "The product solves the problem but is a black box; developers want programmatic control and integration flexibility.",
    "The startup addresses a broad horizontal need; a vertical-specific product for a specific industry would outperform it.",
  ],
  "Benchmarks": [
    "Teams select AI models based on generic benchmarks that don't reflect their actual production query distribution.",
    "Model quality regressions are caught manually after deployment; automated benchmark-based CI prevents this.",
    "Comparing models across cost, latency, and quality dimensions requires custom tooling most teams don't have.",
  ],
  "Tools": [
    "The tool is powerful but doesn't integrate with the rest of the developer's stack, requiring manual context-switching.",
    "Team collaboration features are missing; the tool works for individuals but breaks down for shared workflows.",
    "The tool has no programmatic API, making it impossible to automate or embed into existing development pipelines.",
  ],
  "Security": [
    "LLM applications in production have no systematic protection against prompt injection attacks from user inputs.",
    "Security teams lack tooling purpose-built for AI system vulnerabilities, relying on traditional scanners that miss AI-specific issues.",
    "Developers shipping AI features have no standard way to test robustness against adversarial inputs before release.",
  ],
};

const TECH_STACKS: Record<string, string[][]> = {
  "OpenAI": [
    ["Next.js", "OpenAI SDK", "Vercel AI SDK", "Supabase"],
    ["Remix", "OpenAI SDK", "Drizzle ORM", "Cloudflare Workers"],
    ["FastAPI", "openai-python", "Pydantic", "PostgreSQL"],
  ],
  "Anthropic": [
    ["Next.js", "Anthropic SDK", "LangChain", "Supabase"],
    ["FastAPI", "anthropic-python", "Pydantic", "Redis"],
    ["Next.js", "Anthropic SDK", "Vercel AI SDK", "Postgres"],
  ],
  "Coding Agents": [
    ["TypeScript", "OpenAI Assistants", "GitHub API", "Vercel"],
    ["Python", "LangGraph", "GitHub Actions", "Supabase"],
    ["Next.js", "Anthropic SDK", "Octokit", "Postgres"],
  ],
  "MCP": [
    ["TypeScript", "MCP SDK", "Node.js", "Supabase"],
    ["Python", "MCP Python SDK", "FastAPI", "Redis"],
    ["TypeScript", "MCP SDK", "Cloudflare Workers", "D1"],
  ],
  "GitHub Repos": [
    ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    ["Remix", "shadcn/ui", "Drizzle ORM", "Fly.io"],
    ["Next.js", "TypeScript", "Postgres", "Docker"],
  ],
  "Research Papers": [
    ["Python", "PyTorch", "FastAPI", "Hugging Face"],
    ["Python", "JAX", "Gradio", "Modal"],
    ["TypeScript", "ONNX Runtime", "Next.js", "Vercel"],
  ],
  "AI Startups": [
    ["Next.js", "Supabase", "Stripe", "Vercel"],
    ["Remix", "Drizzle ORM", "LemonSqueezy", "Fly.io"],
    ["FastAPI", "PostgreSQL", "Stripe", "Railway"],
  ],
  "Benchmarks": [
    ["Python", "LangSmith", "Pytest", "Supabase"],
    ["TypeScript", "Vitest", "OpenAI SDK", "Postgres"],
    ["Python", "W&B Weave", "FastAPI", "Redis"],
  ],
  "Tools": [
    ["Next.js", "TypeScript", "Supabase", "Vercel"],
    ["Electron", "TypeScript", "SQLite", "Node.js"],
    ["VS Code Extension API", "TypeScript", "Node.js", "REST API"],
  ],
  "Security": [
    ["Python", "FastAPI", "LangChain", "Redis"],
    ["TypeScript", "Next.js", "Supabase", "Vercel"],
    ["Python", "Pydantic", "FastAPI", "PostgreSQL"],
  ],
};

const DIFFICULTIES: Record<string, Difficulty[]> = {
  "OpenAI":         ["Beginner", "Intermediate", "Intermediate"],
  "Anthropic":      ["Intermediate", "Intermediate", "Advanced"],
  "Coding Agents":  ["Intermediate", "Intermediate", "Advanced"],
  "MCP":            ["Intermediate", "Intermediate", "Advanced"],
  "GitHub Repos":   ["Beginner", "Intermediate", "Intermediate"],
  "Research Papers":["Advanced", "Advanced", "Intermediate"],
  "AI Startups":    ["Intermediate", "Intermediate", "Advanced"],
  "Benchmarks":     ["Intermediate", "Beginner", "Intermediate"],
  "Tools":          ["Beginner", "Intermediate", "Intermediate"],
  "Security":       ["Advanced", "Advanced", "Intermediate"],
};

const MVP_SCOPES: Record<string, string[][]> = {
  "OpenAI": [
    ["Single-turn chat interface with the new model", "Streaming responses with token counting", "API key management and rate limiting", "Basic prompt templates library"],
    ["Model routing based on query complexity", "Cost tracking dashboard", "Fallback chain on rate limit or error"],
    ["Structured output with Zod schema validation", "JSON mode with retry on parse failure", "Schema playground UI"],
  ],
  "Anthropic": [
    ["Upload + chunk long documents", "Semantic search over chunks", "Q&A interface with citation"],
    ["Content classification with confidence scores", "Rules editor for custom policies", "Override and audit log UI"],
    ["Agent loop with tool calling", "Conversation memory with summarisation", "Tool result rendering UI"],
  ],
  "Coding Agents": [
    ["GitHub webhook listener for PR events", "Agent that reads diff and writes test stubs", "Commit test files back to branch"],
    ["Diff summariser from GitHub PR", "One-sentence description generator", "Draft PR description with bullet points"],
    ["File-level refactoring suggestions", "Dry-run mode with diff preview", "Approval gate before applying changes"],
  ],
  "MCP": [
    ["MCP server with 3 core tools exposed", "Authentication via API key", "Tool schema and documentation auto-generated"],
    ["List, get, create, update operations", "Type-safe schema for all tools", "Local testing harness"],
    ["Wrap 5 most-used API endpoints as tools", "Rate limiting and error handling", "One-click deployment script"],
  ],
  "GitHub Repos": [
    ["Hosted deployment with one-click setup", "Web UI over core functionality", "User authentication and project isolation"],
    ["REST API wrapping the library's core", "Usage dashboard", "API key management"],
    ["Import / export for user data", "Basic team sharing", "Webhook notifications"],
  ],
  "Research Papers": [
    ["Minimal re-implementation of the core algorithm", "Benchmark on 3 public datasets", "Comparison table vs baseline"],
    ["REST API endpoint for the technique", "Input validation and error handling", "Latency and quality metrics endpoint"],
    ["Interactive parameter exploration UI", "Side-by-side result comparison", "Export results as CSV"],
  ],
  "AI Startups": [
    ["Core feature parity with the startup's free tier", "Authentication and project management", "Basic usage limits and quotas"],
    ["SDK with the 3 most-used API operations", "API key auth and rate limiting", "Usage dashboard"],
    ["Niche variant targeting one vertical", "Vertical-specific templates and defaults", "Landing page with comparison table"],
  ],
  "Benchmarks": [
    ["Run a model against the benchmark tasks", "Score report as JSON and HTML", "CI integration via GitHub Action"],
    ["Model comparison table", "Filter by task type and difficulty", "Cost vs quality scatter plot"],
    ["Upload your own evaluation dataset", "Side-by-side model output viewer", "Regression detection with configurable threshold"],
  ],
  "Tools": [
    ["Core workflow automation with the tool's API", "Configuration file or UI", "Dry-run preview mode"],
    ["VS Code extension with one core command", "Output panel with structured results", "Settings page for API key and preferences"],
    ["CLI with three subcommands", "Config file support", "JSON output mode for scripting"],
  ],
  "Security": [
    ["Input scanning with risk score", "Configurable blocklist patterns", "Audit log of flagged inputs"],
    ["Automated test suite for 10 known injection patterns", "Pass / fail report with details", "GitHub Action integration"],
    ["Real-time monitoring dashboard", "Alert on anomalous input patterns", "Integration with existing API gateway"],
  ],
};

const TIME_ESTIMATES: Record<string, string[]> = {
  "OpenAI":         ["1 weekend", "2 weekends", "1–2 weekends"],
  "Anthropic":      ["2 weekends", "2–3 weekends", "1–2 weekends"],
  "Coding Agents":  ["2–3 weekends", "1–2 weekends", "3–4 weekends"],
  "MCP":            ["1 weekend", "1–2 weekends", "2 weekends"],
  "GitHub Repos":   ["2–3 weekends", "1–2 weekends", "2–3 weekends"],
  "Research Papers":["3–6 weekends", "4–8 weekends", "2–3 weekends"],
  "AI Startups":    ["3–5 weekends", "1–2 weekends", "2–4 weekends"],
  "Benchmarks":     ["1 weekend", "1–2 weekends", "2 weekends"],
  "Tools":          ["1 weekend", "1–2 weekends", "2–3 weekends"],
  "Security":       ["2–3 weekends", "1–2 weekends", "3–5 weekends"],
};

// ─── Template-based generation ────────────────────────────────────────────────

function buildTemplate(article: {
  title:    string;
  summary:  string;
  category: string;
}): BuildIdea {
  const { title, category } = article;
  const cat = category in IDEA_NAMES ? category : "Tools";

  const idx = djb2(title) % 3;

  const idea_name      = pick(IDEA_NAMES[cat]!,      title);
  const problem_solved = pick(PROBLEM_SOLVED[cat]!,   title, 1);
  const tech_stack     = TECH_STACKS[cat]?.[idx]      ?? TECH_STACKS["Tools"]![0]!;
  const difficulty     = DIFFICULTIES[cat]?.[idx]     ?? "Intermediate";
  const mvp_scope      = MVP_SCOPES[cat]?.[idx]       ?? MVP_SCOPES["Tools"]![0]!;
  const time_estimate  = pick(TIME_ESTIMATES[cat]!,   title);

  return {
    idea_name,
    problem_solved,
    tech_stack,
    difficulty,
    mvp_scope,
    time_estimate,
    generated_at: new Date().toISOString(),
  };
}

// ─── HuggingFace-enhanced generation ─────────────────────────────────────────

const BUILD_PROMPT = (a: { title: string; summary: string; category: string }) => `
You are a senior software engineer and product builder. Given the article below, generate a concrete builder idea as JSON with exactly these keys:
- "idea_name": concise product or tool name (5-8 words max)
- "problem_solved": 1-2 sentences on the problem this idea solves
- "tech_stack": array of exactly 4 technology names (frameworks, libraries, platforms)
- "difficulty": exactly one of "Beginner", "Intermediate", or "Advanced"
- "mvp_scope": array of exactly 4 short MVP features starting with a verb
- "time_estimate": realistic solo-developer time estimate like "2 weekends" or "3-4 weekends"

Article title: ${a.title}
Category: ${a.category}
Summary: ${a.summary.slice(0, 500)}

Respond with ONLY valid JSON, no markdown fences, no explanation.`.trim();

function parseJson(text: string): Partial<BuildIdea> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as Partial<BuildIdea>;
  } catch { return null; }
}

export async function generateBuildIdea(article: {
  title:    string;
  summary:  string;
  category: string;
}): Promise<BuildIdea> {
  const base = buildTemplate(article);

  if (!process.env.HUGGINGFACE_API_KEY) return base;

  try {
    const client = hf();
    const resp = await client.chatCompletion({
      model:    "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [{ role: "user", content: BUILD_PROMPT(article) }],
      max_tokens:  500,
      temperature: 0.4,
    });

    const text   = resp.choices[0]?.message?.content ?? "";
    const parsed = parseJson(text);

    const VALID_DIFFICULTY = new Set<string>(["Beginner", "Intermediate", "Advanced"]);

    if (
      parsed &&
      typeof parsed.idea_name      === "string" &&
      typeof parsed.problem_solved === "string" &&
      Array.isArray(parsed.tech_stack) &&
      typeof parsed.difficulty     === "string" &&
      VALID_DIFFICULTY.has(parsed.difficulty) &&
      Array.isArray(parsed.mvp_scope) &&
      typeof parsed.time_estimate  === "string"
    ) {
      return {
        idea_name:      parsed.idea_name.trim(),
        problem_solved: parsed.problem_solved.trim(),
        tech_stack:     (parsed.tech_stack as string[]).slice(0, 6).map((s) => s.trim()),
        difficulty:     parsed.difficulty as Difficulty,
        mvp_scope:      (parsed.mvp_scope as string[]).slice(0, 6).map((s) => s.trim()),
        time_estimate:  parsed.time_estimate.trim(),
        generated_at:   new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn("[BUILD IDEA] HF generation failed, using template:", (err as Error).message);
  }

  return base;
}
