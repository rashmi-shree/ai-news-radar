import { InferenceClient } from "@huggingface/inference";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentType = "reel" | "youtube" | "linkedin";

export interface ContentGeneration {
  type:         ContentType;
  hook:         string;
  body:         string;
  cta:          string;
  generated_at: string;
}

// ─── HF client ────────────────────────────────────────────────────────────────

let _hf: InferenceClient | null = null;
function hf(): InferenceClient {
  if (!_hf) _hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY ?? "");
  return _hf;
}

// ─── Deterministic seed helper ────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: string, offset = 0): T {
  return arr[(djb2(seed) + offset) % arr.length];
}

// ─── Reel hooks ───────────────────────────────────────────────────────────────

const REEL_HOOKS: Record<string, string[]> = {
  "OpenAI": [
    "OpenAI just dropped something big — and most builders haven't seen it yet 👀",
    "This new OpenAI feature will change how you build AI apps. Here's what you need to know ⚡",
    "POV: OpenAI just made your next product 10x easier to build 🚀",
  ],
  "Anthropic": [
    "Anthropic just shipped something that makes Claude insanely more useful for builders 🧠",
    "This Claude update is a game-changer — here's why you should care 🔥",
    "If you're building with AI, Anthropic's latest is not optional to know 👇",
  ],
  "Coding Agents": [
    "AI coding agents are getting scary good. Here's what just shipped 🤖",
    "Devs: this coding agent update will save you hours every week ⏱️",
    "The future of software development just got a little closer 👨‍💻",
  ],
  "MCP": [
    "MCP is taking over the AI agent space. Here's why it matters for builders 🔌",
    "This MCP release changes how AI agents connect to your tools 🛠️",
    "If you don't know what MCP is yet, now's the time to learn 🚀",
  ],
  "GitHub Repos": [
    "This open-source repo is blowing up — and you can build a product on it 💡",
    "Drop everything. This GitHub repo just made your next app idea possible 🔥",
    "Trending AI repo that every developer needs to star right now ⭐",
  ],
  "Research Papers": [
    "A new AI research paper just dropped and it's going to change what's possible 📄",
    "Researchers just solved a problem builders have been stuck on for years 🧬",
    "This paper will be in every AI product within 12 months — read it now 🔮",
  ],
  "AI Startups": [
    "This AI startup just launched and I'm already obsessed 🚀",
    "New AI company alert — and their approach is genuinely interesting 👀",
    "Another day, another AI startup solving a real problem. Let me explain 💡",
  ],
  "Benchmarks": [
    "New AI benchmarks are out and the results are wild 📊",
    "This model benchmark just reshuffled the leaderboard — what it means for you ⚡",
    "Stop picking AI models randomly. Here's what the latest benchmarks actually tell us 🎯",
  ],
  "Tools": [
    "This new AI tool just made my workflow 3x faster — and it might change yours too 🔧",
    "POV: you discover a tool that removes 80% of your most annoying work 🎉",
    "Another AI tool dropped and this one is actually worth your attention ✅",
  ],
  "Security": [
    "There's a new security finding every AI builder needs to know about right now 🚨",
    "Your AI app might be exposed. Here's what just surfaced in the community 🔐",
    "Builders: this security finding should be on your radar today ⚠️",
  ],
};

const REEL_BODIES: Record<string, string[]> = {
  "OpenAI": [
    "→ What changed: [new capability / API feature]\n→ Why it matters: lower cost, better quality, or new possibilities\n→ How to use it today: upgrade your SDK, test on your use case\n→ Who should care: anyone shipping AI features in production",
    "1️⃣ The new model is [X] faster / cheaper / smarter\n2️⃣ You can now do [capability] without a complex workaround\n3️⃣ Pricing changes: here's how it affects your bill\n4️⃣ Action: update your integration this week",
    "Here's the 30-second breakdown:\n✅ New release: what it actually is\n✅ What's different vs before\n✅ Best use case right now\n✅ What to build with it",
  ],
  "Anthropic": [
    "→ New Claude capability that changes the game\n→ Builders are already using it for [long-context tasks / agents / moderation]\n→ The API change you need to know about\n→ My honest take: this is actually worth switching for",
    "1️⃣ Claude just got [longer context / better reasoning / faster]\n2️⃣ Real use case: [document processing / coding / analysis]\n3️⃣ Compare to GPT-4: here's the difference\n4️⃣ Best prompt to try right now",
    "Claude update breakdown:\n✅ What Anthropic shipped\n✅ Who it helps most\n✅ How to test it on your project\n✅ Whether the price is worth it",
  ],
  "Coding Agents": [
    "→ What the agent can now do that it couldn't before\n→ Real workflow it replaces or accelerates\n→ How to integrate it in under 30 minutes\n→ The one task it handles better than any human",
    "1️⃣ Coding agent update: write tests / PRs / reviews automatically\n2️⃣ The time savings are real — here's the math\n3️⃣ Best integration for solo devs vs teams\n4️⃣ Gotcha: still needs a human review gate",
    "Agent update breakdown:\n✅ New capability shipped\n✅ How it fits your workflow\n✅ Setup time: under 1 hour\n✅ Where it still needs your help",
  ],
  "MCP": [
    "→ MCP = Model Context Protocol (the new agent standard)\n→ What this release adds: new tools / better auth / faster responses\n→ Why every AI product will need to support it\n→ How to build your first MCP server this weekend",
    "1️⃣ MCP is how AI agents talk to your tools\n2️⃣ New release: [what changed]\n3️⃣ Why you should implement it now, not later\n4️⃣ Starter code is already on GitHub",
    "MCP explained for builders:\n✅ What it is in plain English\n✅ This latest update in 30 seconds\n✅ Which agent runtimes support it\n✅ How to wrap your API in 1 weekend",
  ],
  "GitHub Repos": [
    "→ What this repo does (one sentence)\n→ Why it's trending: stars, forks, real use case\n→ What you can build on top of it\n→ Time to fork and ship: [1-2 weekends]",
    "1️⃣ Found this repo: [name] — here's why it's blowing up\n2️⃣ Core capability: [what it solves]\n3️⃣ Product idea: turn it into a SaaS in [X] weekends\n4️⃣ Link in bio",
    "Open-source breakdown:\n✅ What the repo does\n✅ Who built it and why\n✅ Business idea hiding inside it\n✅ How to run it locally in 5 minutes",
  ],
  "Research Papers": [
    "→ Paper title and the one-line idea\n→ Problem it solves that wasn't solved before\n→ How soon this will be in a product you use\n→ The part that matters most for builders",
    "1️⃣ New research paper dropped: here's the key idea\n2️⃣ Why researchers are excited about it\n3️⃣ When it becomes a real product feature\n4️⃣ The thing nobody else is talking about yet",
    "Paper breakdown for non-researchers:\n✅ The core idea in plain English\n✅ What problem it actually solves\n✅ Existing open-source implementations\n✅ Should you learn this now or wait?",
  ],
  "AI Startups": [
    "→ What they built (one sentence)\n→ Problem they're solving that nobody else is\n→ Business model: freemium / API / enterprise\n→ My honest take: real pain point or hype?",
    "1️⃣ New AI startup alert: [name] just launched\n2️⃣ Their angle: [unique approach]\n3️⃣ Who it's for: [target user]\n4️⃣ Will it survive? Here's my read",
    "Startup breakdown:\n✅ Product in 10 words\n✅ Why now?\n✅ Competitors they'll face\n✅ What to steal for your own product",
  ],
  "Benchmarks": [
    "→ What was tested: [model / task / metric]\n→ Winner: [model] beats [competitor] by [X]%\n→ What this changes about model selection\n→ The benchmark that actually matches real workloads",
    "1️⃣ New AI benchmark results: [what was tested]\n2️⃣ Top performer: [model] and why\n3️⃣ Cost vs quality — the real tradeoff\n4️⃣ What to switch to if you care about [task]",
    "Benchmark breakdown:\n✅ What they measured\n✅ Who won and by how much\n✅ The metric that matters most\n✅ Model recommendation for [use case]",
  ],
  "Tools": [
    "→ What the tool does in one sentence\n→ The workflow problem it eliminates\n→ Setup time: [X] minutes\n→ Free tier or not: [answer]",
    "1️⃣ New AI tool just dropped: [name]\n2️⃣ It replaces: [old workflow / manual process]\n3️⃣ Setup: [X] minutes, no config needed\n4️⃣ Verdict: actually useful or just hype?",
    "Tool breakdown:\n✅ Core feature\n✅ Who it's actually for\n✅ How it connects to your existing stack\n✅ Free vs paid — is it worth it?",
  ],
  "Security": [
    "→ What was found: [issue type]\n→ Who is affected: [systems / models / apps]\n→ How to check if you're exposed: [quick audit]\n→ Fix: [code change / config / update]",
    "1️⃣ New security finding: here's what happened\n2️⃣ Impact: who needs to act right now\n3️⃣ Quick audit: how to check your system\n4️⃣ Fix: what to do today",
    "Security breakdown:\n✅ The issue explained simply\n✅ Systems at risk\n✅ Severity: critical / moderate / low\n✅ How to address it this week",
  ],
};

const REEL_CTAS: string[] = [
  "Follow for daily AI builder updates 🔔",
  "Save this so you don't forget it 🔖",
  "Comment 'LINK' and I'll DM you the resource 📩",
  "Share this with one person building with AI 🔁",
  "Follow + turn on notifications — I post this stuff daily ⚡",
  "Drop a 🔥 if you're already using this",
  "Which part surprised you most? Comment below 👇",
  "Tag a builder who needs to see this 👀",
];

// ─── YouTube hooks ─────────────────────────────────────────────────────────────

const YT_HOOKS: Record<string, string[]> = {
  "OpenAI": [
    "In this video, I'm breaking down everything you need to know about OpenAI's latest release — and why it should change how you build your next AI product.",
    "OpenAI just shipped something that most developers haven't fully processed yet. By the end of this video, you'll know exactly what changed and what to do about it.",
    "I spent the last 48 hours testing OpenAI's new release so you don't have to. Here's everything that actually matters for production AI builders.",
  ],
  "Anthropic": [
    "Anthropic just made a move that changes the competitive landscape for AI builders. Let me show you what it means for your projects.",
    "I've been testing the new Claude capabilities all week and in this video I'll tell you exactly when to choose Claude over GPT — and when not to.",
    "The new Anthropic release is more significant than most people think. Here's the full breakdown plus what you should actually build with it.",
  ],
  "Coding Agents": [
    "Coding agents just crossed a threshold that changes how professional developers should think about their workflow. Let me explain exactly what happened.",
    "I want to show you how I'm using the latest coding agent update to ship 3x faster — and what it realistically can't do yet.",
    "In this video, we're going hands-on with the latest coding agent release. I'll run it against my own codebase and show you exactly where it shines.",
  ],
  "MCP": [
    "MCP — the Model Context Protocol — is quietly becoming the most important protocol in AI development. In this video, I'll explain why and show you how to implement it.",
    "If you're building AI products and you don't understand MCP yet, you're already behind. This video will get you up to speed in under 20 minutes.",
    "I built an MCP server this weekend and I want to walk you through the whole thing — what it is, how it works, and why it matters for your product.",
  ],
  "GitHub Repos": [
    "There's a GitHub repository trending right now that is genuinely one of the most interesting open-source AI projects I've seen. Let me break it down.",
    "I found an open-source project this week that could be the foundation of your next product. In this video I'll show you exactly what it does and how to build on it.",
    "I'm going to walk through this trending repository line by line and by the end of this video you'll understand exactly what to build with it.",
  ],
  "Research Papers": [
    "A research paper just dropped that I think most people in the builder community are sleeping on. Let me break it down so you know what to do with it.",
    "In this video, I'm translating a really important AI research paper into plain English — and more importantly, showing what it means for what you can actually build.",
    "I read this paper so you don't have to. In the next 15 minutes, I'll give you everything that matters for builders and tell you when this will become a product feature.",
  ],
  "AI Startups": [
    "A new AI startup just launched and I think their approach is worth understanding — whether you're a competitor, a potential customer, or just someone trying to understand where the space is going.",
    "In this video I'm doing a deep dive on this AI startup — what they built, why now, what they got right, and what I'd do differently.",
    "Every week I look at new AI startups so you can decide what to pay attention to. This week's one is actually interesting.",
  ],
  "Benchmarks": [
    "New AI benchmark results just dropped and they reshape how you should think about model selection. In this video I'll walk you through what was tested and what it means for you.",
    "I've been waiting for these benchmark results and they're finally here. Let me show you what changed at the top of the leaderboard and how it should affect your architecture decisions.",
    "Benchmarks are often misleading. In this video I'll break down the new results, explain what the numbers actually mean, and tell you which model you should be using for your specific use case.",
  ],
  "Tools": [
    "A new AI tool just launched and I spent a week integrating it into my workflow. Here's my honest verdict plus how to decide if it's right for you.",
    "In this video I'm doing a full walkthrough and review of the new tool that's getting a lot of attention in the AI builder space.",
    "I want to show you how I evaluated this new AI tool against my existing workflow — what I tested, what I found, and whether I'm keeping it.",
  ],
  "Security": [
    "There's a security finding making the rounds right now that every developer building with AI needs to understand. Let me break down exactly what it is and what to do.",
    "In this video I'm going through a significant finding that affects a lot of production AI applications — and I'll show you exactly how to check if you're exposed.",
    "Security in AI systems is still an afterthought for most developers. This recent finding is a good reminder of why that needs to change — and what to do about it.",
  ],
};

const YT_BODIES: Record<string, string[]> = {
  "OpenAI": [
    "**Intro** (0-2 min): Quick context — what's new and why you should care\n**What Changed** (2-6 min): Deep dive into the new capability / API / pricing\n**Live Demo** (6-12 min): Testing it in a real project setup\n**Comparison** (12-15 min): How it stacks up against the previous version\n**Build Ideas** (15-18 min): Three concrete things you can ship with this\n**Wrap-up** (18-20 min): Summary + my honest take",
    "**Hook + Context** (0-2 min)\n**The Feature Explained** (2-5 min): What it does in plain language\n**When to Use It** (5-9 min): Specific use cases with code examples\n**When NOT to Use It** (9-12 min): Limitations and gotchas\n**Implementation Walkthrough** (12-17 min): Building a simple integration live\n**Cost Analysis** (17-19 min): What this means for your API bill\n**Next Steps** (19-20 min)",
  ],
  "Anthropic": [
    "**Intro** (0-2 min): Why this Claude update matters\n**New Capabilities** (2-7 min): What's new and what's improved\n**Use Case Deep Dive** (7-13 min): Long-context / reasoning / agents — pick the relevant one\n**GPT vs Claude Comparison** (13-16 min): Honest side-by-side\n**Best Prompts to Get Started** (16-19 min)\n**Verdict** (19-20 min): When to switch and when to stay",
  ],
  "Coding Agents": [
    "**Intro** (0-2 min): The state of coding agents and why this update matters\n**What's New** (2-6 min): New capabilities, benchmark improvements\n**Live Integration** (6-14 min): Adding it to a real codebase, showing output quality\n**Where It's Impressive** (14-17 min)\n**Where It Still Falls Short** (17-19 min)\n**My Workflow** (19-22 min): How I actually use it day-to-day",
  ],
  "MCP": [
    "**What is MCP?** (0-3 min): Protocol explainer for beginners\n**Why It Matters** (3-6 min): The bigger picture of agent-native tools\n**This Release** (6-8 min): What changed in the latest version\n**Build a Basic MCP Server** (8-18 min): Live coding walkthrough\n**Testing with Claude/Cursor** (18-22 min): Connecting it to an agent runtime\n**Production Considerations** (22-24 min): Auth, rate limits, deployment",
  ],
  "GitHub Repos": [
    "**Overview** (0-2 min): What the repo does and why it's trending\n**Architecture Walkthrough** (2-7 min): Key files, how it's structured\n**Running Locally** (7-11 min): Setup, demo, first results\n**Code Deep Dive** (11-16 min): The clever parts worth understanding\n**Product Ideas** (16-20 min): Three things you could ship on top of this\n**Contributing / Forking** (20-22 min): How to extend it",
  ],
  "Research Papers": [
    "**The Problem** (0-3 min): What researchers were trying to solve\n**The Idea** (3-8 min): Core technique explained visually\n**The Results** (8-11 min): What they actually measured and proved\n**Existing Implementations** (11-14 min): What's already on GitHub\n**Product Angle** (14-18 min): How this becomes a real feature\n**Timeline** (18-20 min): When to expect this in production models",
  ],
  "AI Startups": [
    "**Company Overview** (0-2 min): Who they are, when they launched\n**The Problem They're Solving** (2-5 min)\n**Product Demo** (5-11 min): Walking through the actual product\n**Business Model Analysis** (11-14 min): Pricing, target market, competitive moat\n**What They Got Right** (14-17 min)\n**What I'd Do Differently** (17-19 min)\n**Verdict** (19-20 min): Worth your attention or not?",
  ],
  "Benchmarks": [
    "**Benchmark Overview** (0-3 min): What was tested and why it matters\n**Results Breakdown** (3-9 min): Walking through the numbers\n**What the Winners Did Right** (9-13 min)\n**Misleading Metrics to Ignore** (13-16 min)\n**Model Recommendation by Use Case** (16-19 min)\n**Cost vs Quality Tradeoff** (19-21 min)",
  ],
  "Tools": [
    "**What the Tool Does** (0-2 min)\n**Setup and First Run** (2-7 min): Live installation and first test\n**Core Features Walkthrough** (7-14 min)\n**Integration with [VS Code / CI / Existing Workflow]** (14-18 min)\n**Pricing and Limits** (18-20 min)\n**Verdict: Keep or Delete?** (20-22 min)",
  ],
  "Security": [
    "**The Issue Explained** (0-4 min): What it is, how it works\n**Who's Affected** (4-7 min): Systems, models, use cases at risk\n**Live Demo** (7-13 min) [educational, sandboxed]\n**Testing Your Own System** (13-17 min): Audit checklist\n**Fix Steps** (17-21 min): Code-level changes\n**Bigger Picture** (21-23 min): What this tells us about building secure AI systems",
  ],
};

const YT_CTAS: string[] = [
  "If you found this useful, hit like and subscribe — I post deep dives like this every week. Drop any questions in the comments and I'll answer them.",
  "Subscribe for weekly AI builder content. If you want the code from this video, the link is in the description.",
  "Let me know in the comments: what do you want me to build next? And if this saved you time, a like goes a long way.",
  "Subscribe if you want to keep up with the AI builder space without spending hours reading every day. New video every week.",
  "What would you build with this? Drop your idea in the comments — I read every one. Subscribe for more.",
];

// ─── LinkedIn hooks ────────────────────────────────────────────────────────────

const LI_HOOKS: Record<string, string[]> = {
  "OpenAI": [
    "I just tested OpenAI's latest release and here's my honest take as a builder:",
    "Hot take: this OpenAI update will change how we architect AI applications over the next 12 months.",
    "OpenAI shipped something this week that most people aren't talking about. Here's why it matters:",
  ],
  "Anthropic": [
    "After a week of testing Anthropic's latest, I have some thoughts that might surprise you.",
    "The AI vendor war just shifted. Here's what Anthropic's latest release means for builders choosing their stack:",
    "I switched two of my projects to Claude this month. Here's why — and what I'd tell you to consider:",
  ],
  "Coding Agents": [
    "I've been tracking coding agents for 2 years. This release is the first time I've felt genuine workflow change.",
    "Honest question: when does a coding agent become a coding co-founder? We might be getting closer.",
    "I just ran the new coding agent on my production codebase. The results were better than I expected — and worse in one important way:",
  ],
  "MCP": [
    "If you're building AI products and haven't looked at MCP yet, this week's release is your sign to start.",
    "The protocol that will power the next generation of AI products just got a significant update. Here's what to know:",
    "I built my first MCP server last weekend. Here's what surprised me — and why every API company needs to pay attention:",
  ],
  "GitHub Repos": [
    "I spent my weekend studying a GitHub repository that might be the foundation of someone's next profitable product.",
    "A quick note on the most interesting open-source AI project I've seen this month:",
    "This repository is trending for good reason. Here's what I found when I dug into the code:",
  ],
  "Research Papers": [
    "A research paper dropped this week that I think every AI builder should read — or at least understand.",
    "I translated a recent AI research paper into plain English so you don't have to. Here's the part that matters:",
    "Research-to-product cycles are getting shorter. This new paper will probably be a product feature in under a year:",
  ],
  "AI Startups": [
    "I spent time this week looking at a new AI startup and I have some thoughts worth sharing:",
    "New AI startup alert — and this one is solving a problem that every builder I know complains about:",
    "Not every AI startup launch deserves attention. This one does. Here's why:",
  ],
  "Benchmarks": [
    "New AI benchmarks just dropped and they change some of my model recommendations. Here's the updated picture:",
    "I always say: never pick a model based on generic benchmarks. But these new results actually track with real-world performance:",
    "A thought on the new model benchmarks — what to believe and what to ignore:",
  ],
  "Tools": [
    "I tried the new AI tool everyone is talking about. Here's my honest 5-day review:",
    "One tool just made it into my permanent stack. Here's what convinced me:",
    "Most AI tool launches are noise. This one is different, and here's why:",
  ],
  "Security": [
    "There's a security finding this week that every developer deploying LLMs should know about:",
    "A security finding in the AI space this week that deserves more attention than it's getting:",
    "We talk a lot about AI capabilities. We don't talk enough about security. This week's finding is a good reminder:",
  ],
};

const LI_BODIES: Record<string, string[]> = {
  "OpenAI": [
    "Here's my honest breakdown of what changed:\n\n**What's new:** The core change is [capability / pricing / model]. The API surface is slightly different, so expect a migration if you're on older SDK versions.\n\n**Who benefits most:** Teams doing [specific use case] will see the biggest improvement. If you're running heavy workloads, the cost change alone is significant.\n\n**The part most people miss:** There's a subtle [context handling / rate limit / structured output] change that will break some existing prompts. Check your eval suite before upgrading.\n\n**My recommendation:** Update your dev environment this week. Test your critical paths. Don't upgrade prod until you've run your benchmarks.\n\nThe direction OpenAI is heading is clear: lower cost, better quality, more capable models faster. As builders, we need to keep our abstractions loose enough to take advantage.",
    "Three things I think are underreported about this OpenAI release:\n\n1️⃣ **The quality jump is real** — not incremental. I ran it through 50 of my standard eval prompts and the results speak for themselves.\n\n2️⃣ **The API change is subtle but important** — if you're relying on specific token counting or context window behavior, read the changelog carefully.\n\n3️⃣ **Pricing math changed** — run the numbers on your production usage. For some workloads, this is a meaningful cost reduction.\n\nThe bottom line: OpenAI keeps executing. Whether you like them or not, you need to keep up.",
  ],
  "Anthropic": [
    "Three weeks ago I started testing Anthropic's latest release in parallel with GPT-4 on my actual production prompts.\n\nHere's what I found:\n\n**Where Claude wins:** Long-context tasks, anything that requires careful reasoning, and use cases where hallucination risk is high. The instruction-following is genuinely better for complex, multi-step prompts.\n\n**Where GPT-4 still edges ahead:** Speed, ecosystem integrations, and function calling for complex schemas.\n\n**The thing nobody tells you:** The difference in quality isn't uniform — it's highly task-dependent. You need to benchmark on YOUR data, not someone else's eval.\n\nMy advice: run both on your top 20 production use cases. The results will probably surprise you.",
  ],
  "Coding Agents": [
    "I want to be honest about coding agents because there's a lot of hype and not enough nuance.\n\nThis latest release is genuinely good. But here's what I think is important to understand:\n\n**What it does well:** Writing test suites, PR descriptions, migration stubs, and boilerplate. Things that are mechanical and time-consuming. Things that slow down good developers.\n\n**What it still doesn't do well:** Understanding architecture, making tradeoffs, and knowing when NOT to write code. That's still on you.\n\n**The right mental model:** Think of it as a fast intern who is very literal. You need to give precise instructions, review everything, and set up guard rails.\n\nThe developers who use this effectively aren't the ones who treat it as a magic wand. They're the ones who've thought carefully about where in their workflow it fits.",
  ],
  "MCP": [
    "I want to explain MCP (Model Context Protocol) for the people who keep hearing the term but aren't sure if it's relevant to them.\n\nThe short version: MCP is a standard for how AI agents connect to external tools and data sources. Think of it as USB-C for AI integrations.\n\n**Why this latest release matters:** [What changed — auth, tooling, performance, adoption]\n\n**Why builders should care:** Every hour you spend writing custom integration code between your product and AI agents is an hour you didn't spend on the actual problem. MCP is a bet on that overhead disappearing.\n\n**What to do this week:** If you have an internal API or data source that you'd want AI to access, spend 2 hours prototyping an MCP server. The SDK is simpler than you think.\n\nThe winners in the next wave of AI products will be the ones who made their systems agent-native early.",
  ],
  "GitHub Repos": [
    "I've been spending time with a repository that's been trending this week and I want to share what I found.\n\n**What it does:** [Core capability in one sentence]\n\n**Why it's interesting:** The approach here is [novel / unusually clean / impressively performant]. The [specific part] is something I haven't seen implemented this well in open source before.\n\n**What I'd build on top of it:** The core functionality is solid but the product layer is thin. There's a real opportunity to add [auth / billing / UI / multi-tenancy] and ship this as a proper product.\n\n**Caution:** License is [X]. Check before you build commercially.\n\nIf you're looking for a project to work on this weekend, this is worth a few hours of your time.",
  ],
  "Research Papers": [
    "I've been reading AI research papers and translating them for builders for a while now. This week's is worth your time.\n\n**The core idea:** [One sentence plain-English explanation]\n\n**Why it's significant:** [What problem it solves that wasn't solved before]\n\n**What it means practically:** In 6-12 months, this technique will likely show up as a feature in one of the major AI APIs. Understanding it now gives you a head start on knowing what to build when it does.\n\n**What to do with it right now:** [Concrete action — find the GitHub repo, run the benchmark, read just the intro and conclusion]\n\nYou don't need to understand the math to understand the implications. And the implications here are real.",
  ],
  "AI Startups": [
    "A new AI startup launched this week and I've spent time looking at it properly rather than just reading the announcement.\n\n**What they built:** [Description]\n\n**The problem they're solving:** [Why this matters] — this is a pain point I've heard from real developers, so the demand is real.\n\n**What's interesting about their approach:** [Technical or product insight]\n\n**What I'd watch:** The enterprise sales motion and whether they can hold the moat once larger players notice the opportunity.\n\n**If you're building in this space:** This launch is useful competitive intelligence regardless of whether you use their product.\n\nI'm paying attention to this one.",
  ],
  "Benchmarks": [
    "New AI model benchmarks dropped and I want to give you my honest read — including the parts that are genuinely useful and the parts to be skeptical about.\n\n**What changed:** [Model] now leads on [task]. [Model 2] dropped in rankings on [benchmark]. The gap between the top tier and mid tier is [narrowing / widening].\n\n**What to believe:** Results on [specific benchmark] correlate well with real-world performance in my experience. They're worth acting on.\n\n**What to be skeptical about:** [Benchmark name] is known to be gamed. Don't weight it heavily.\n\n**My updated recommendation:** For [use case], the new leader is [model]. For [other use case], my previous recommendation still holds.\n\nBenchmarks are inputs to your decision, not the decision. Test on your actual queries.",
  ],
  "Tools": [
    "I've been using the new tool that's getting attention in the builder space for the past week. Here's my honest review.\n\n**What it does well:** [Specific capability] is genuinely impressive. I tested it against my existing workflow and it saved me [time / steps / friction].\n\n**What it doesn't do well:** [Honest limitation]. For [specific use case], I'll still use [alternative].\n\n**Setup:** Easier than I expected. Under 30 minutes to a working integration.\n\n**Pricing:** [Honest take on whether the value is there]\n\n**Verdict:** It's in my stack now. Whether it belongs in yours depends on how often you deal with [specific workflow problem].\n\nHappy to answer specific questions about how I integrated it.",
  ],
  "Security": [
    "There's a security finding in the AI space this week that I want to make sure doesn't fly under the radar for developers.\n\n**What it is:** [Plain-English description]\n\n**Who's affected:** Anyone running [system type] that allows [input type] from untrusted sources. If you're deploying an LLM-powered product, you should assume this applies to you until you verify otherwise.\n\n**How to check your exposure:** [Quick audit — 2-3 steps]\n\n**The fix:** [Code change or configuration update]\n\n**The bigger point:** Building secure AI systems is still an afterthought in most development workflows. We need to build secure-by-default patterns the same way the web did 15 years ago. We're not there yet.\n\nPlease share this with your team. The fix is usually straightforward once you know what to look for.",
  ],
};

const LI_CTAS: string[] = [
  "What's your take on this? I'm curious what other builders are seeing in the field. Drop a comment 👇",
  "Are you using this in production yet? Would love to hear what you're building — comment below.",
  "What am I missing? I like being challenged on these takes. Comment with your disagreement.",
  "If this was useful, repost it to someone building with AI. And follow me for more of these weekly breakdowns.",
  "Curious what this unlocks for your team. What would you build? Let me know 👇",
  "I post weekly breakdowns like this. Follow if you want to stay ahead of the AI builder space without reading everything yourself.",
  "What use case is most relevant to your work right now? Happy to go deeper on it in the comments.",
];

// ─── Template builder ─────────────────────────────────────────────────────────

function buildTemplate(
  type:    ContentType,
  article: { title: string; summary: string; category: string }
): ContentGeneration {
  const { title, category } = article;
  const cat = category in REEL_HOOKS ? category : "Tools";

  switch (type) {
    case "reel": return {
      type,
      hook:         pick(REEL_HOOKS[cat]!,    title),
      body:         pick(REEL_BODIES[cat]!,   title, 1),
      cta:          pick(REEL_CTAS,            title),
      generated_at: new Date().toISOString(),
    };
    case "youtube": return {
      type,
      hook:         pick(YT_HOOKS[cat]!,      title),
      body:         pick(YT_BODIES[cat]!,     title, 1),
      cta:          pick(YT_CTAS,              title),
      generated_at: new Date().toISOString(),
    };
    case "linkedin": return {
      type,
      hook:         pick(LI_HOOKS[cat]!,      title),
      body:         pick(LI_BODIES[cat]!,     title, 1),
      cta:          pick(LI_CTAS,              title),
      generated_at: new Date().toISOString(),
    };
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const TYPE_INSTRUCTIONS: Record<ContentType, string> = {
  reel:     "a 30-60 second short-form video reel (Instagram/TikTok style). Hook: 1-2 punchy sentences. Body: 4-5 short bullet points with emojis. CTA: 1 short engagement call to action.",
  youtube:  "a 15-20 minute YouTube video. Hook: 2-3 sentences that retain viewers. Body: a timestamped video outline (5-7 sections). CTA: 2-3 sentences asking viewers to subscribe and comment.",
  linkedin: "a LinkedIn post for AI builders and tech professionals. Hook: 1 scroll-stopping opening line. Body: 3-4 paragraphs with insights, honest takes, and actionable advice. CTA: 1 question to drive comments.",
};

const CONTENT_PROMPT = (
  type:    ContentType,
  article: { title: string; summary: string; category: string }
) => `
You are a content creator for AI builders. Generate content for ${TYPE_INSTRUCTIONS[type]}

Output a JSON object with exactly three keys:
- "hook": the opening hook
- "body": the main body content
- "cta": the call to action

Article title: ${article.title}
Category: ${article.category}
Summary: ${article.summary.slice(0, 500)}

Respond with ONLY valid JSON, no markdown fences.`.trim();

function parseJson(text: string): Partial<ContentGeneration> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as Partial<ContentGeneration>;
  } catch { return null; }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function generateContent(
  type:    ContentType,
  article: { title: string; summary: string; category: string }
): Promise<ContentGeneration> {
  const base = buildTemplate(type, article);

  if (!process.env.HUGGINGFACE_API_KEY) return base;

  try {
    const client = hf();
    const resp = await client.chatCompletion({
      model:       "mistralai/Mistral-7B-Instruct-v0.2",
      messages:    [{ role: "user", content: CONTENT_PROMPT(type, article) }],
      max_tokens:  800,
      temperature: 0.5,
    });

    const text   = resp.choices[0]?.message?.content ?? "";
    const parsed = parseJson(text);

    if (
      parsed &&
      typeof parsed.hook === "string" &&
      typeof parsed.body === "string" &&
      typeof parsed.cta  === "string"
    ) {
      return {
        type,
        hook:         parsed.hook.trim(),
        body:         parsed.body.trim(),
        cta:          parsed.cta.trim(),
        generated_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(`[CONTENT] HF generation failed for ${type}, using template:`, (err as Error).message);
  }

  return base;
}
