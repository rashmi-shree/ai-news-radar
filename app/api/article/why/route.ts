import { supabase } from "@/src/lib/supabase/client";
import { getUserProfile } from "@/src/lib/supabase/userProfile";
import { TOPIC_KEYWORDS } from "@/src/lib/personalization";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReasonType = "behavior" | "interest" | "tool" | "score";
export type ReasonStrength = "strong" | "moderate" | "weak";

export interface WhyReason {
  id:       string;
  icon:     string;
  label:    string;
  detail?:  string;
  type:     ReasonType;
  strength: ReasonStrength;
}

export interface ScoreBar {
  key:   string;
  label: string;
  value: number;
  max:   number;
  color: string;
}

export interface WhyResponse {
  reasons:      WhyReason[];
  scoreBars:    ScoreBar[];
  builderScore: number;
}

// ─── Tool keyword map ─────────────────────────────────────────────────────────

const TOOL_KEYWORDS: Record<string, string[]> = {
  "OpenAI API":       ["openai", "gpt-4", "gpt-5", "gpt4", "gpt5", "chatgpt", "o1", "o3", "o4"],
  "Claude API":       ["anthropic", "claude", "sonnet", "haiku", "opus"],
  "GitHub Copilot":   ["copilot", "github copilot"],
  "Cursor":           ["cursor", "cursor ide"],
  "LangChain":        ["langchain", "lang chain"],
  "LlamaIndex":       ["llamaindex", "llama index"],
  "Hugging Face":     ["hugging face", "huggingface", "hf"],
  "Vercel AI SDK":    ["vercel ai", "ai sdk", "vercel sdk"],
  "Supabase":         ["supabase"],
  "Pinecone":         ["pinecone"],
  "Weaviate":         ["weaviate"],
  "Replicate":        ["replicate"],
  "Together AI":      ["together ai", "togetherai"],
  "Groq":             ["groq"],
  "Mistral":          ["mistral"],
  "Llama":            ["llama", "meta ai", "llama 3"],
  "Gemini":           ["gemini", "google deepmind", "bard"],
};

// ─── Score bars config ────────────────────────────────────────────────────────

const SCORE_BAR_DEFS: Array<{ key: string; label: string; max: number; color: string }> = [
  { key: "virality_score",          label: "Virality",          max: 30, color: "bg-rose-500"    },
  { key: "build_potential_score",   label: "Build Potential",   max: 35, color: "bg-amber-500"   },
  { key: "content_potential_score", label: "Content Potential", max: 25, color: "bg-sky-500"     },
  { key: "technical_depth_score",   label: "Technical Depth",   max: 20, color: "bg-violet-500"  },
  { key: "freshness_score",         label: "Freshness",         max: 15, color: "bg-emerald-500" },
];

// ─── GET /api/article/why?articleId= ─────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });

  // ── Parallel data fetch ───────────────────────────────────────────────────

  const [articleRes, profileRes, savedRes] = await Promise.allSettled([
    supabase
      .from("articles")
      .select(`
        id, title, summary, ai_summary, category, source,
        builder_score, virality_score, build_potential_score,
        content_potential_score, technical_depth_score, freshness_score
      `)
      .eq("id", articleId)
      .maybeSingle(),

    getUserProfile(),

    supabase
      .from("saved_articles")
      .select("article_id, status")
      .eq("user_id", USER_ID)
      .in("status", ["saved", "investigating", "reviewed"]),
  ]);

  if (articleRes.status === "rejected" || !articleRes.value.data) {
    return Response.json({ ok: false, error: "Article not found" }, { status: 404 });
  }

  const article = articleRes.value.data as {
    id:                    string;
    title:                 string;
    summary:               string;
    ai_summary:            string;
    category:              string;
    source:                string;
    builder_score:         number;
    virality_score:        number;
    build_potential_score: number;
    content_potential_score: number;
    technical_depth_score: number;
    freshness_score:       number;
  };

  const profile = profileRes.status === "fulfilled" ? profileRes.value : null;

  // Build a per-category status count from saved articles
  const catCounts: Map<string, Record<string, number>> = new Map();
  if (savedRes.status === "fulfilled" && savedRes.value.data) {
    type SavedRow = { article_id: string; status: string };

    // We need categories for these article IDs — fetch them
    const savedArticleIds = (savedRes.value.data as SavedRow[]).map((r) => r.article_id);
    const statusByArticle = new Map<string, string>(
      (savedRes.value.data as SavedRow[]).map((r) => [r.article_id, r.status])
    );

    if (savedArticleIds.length > 0) {
      const { data: catData } = await supabase
        .from("articles")
        .select("id, category")
        .in("id", savedArticleIds);

      for (const row of (catData ?? []) as { id: string; category: string }[]) {
        const status = statusByArticle.get(row.id);
        if (!status) continue;
        const existing = catCounts.get(row.category) ?? {};
        existing[status] = (existing[status] ?? 0) + 1;
        catCounts.set(row.category, existing);
      }
    }
  }

  // ── Compute reasons ───────────────────────────────────────────────────────

  const reasons: WhyReason[] = [];
  const haystack = `${article.title} ${article.ai_summary || article.summary}`.toLowerCase();
  const cat = article.category;
  const score = article.builder_score ?? 0;

  // 1. Score-based reasons
  if (score >= 90) {
    reasons.push({
      id: "hot_score", icon: "Flame", label: "Hot build score",
      detail: `Scored ${score} — top tier article this week.`,
      type: "score", strength: "strong",
    });
  } else if (score >= 70) {
    reasons.push({
      id: "high_score", icon: "TrendingUp", label: "High build score",
      detail: `Scored ${score} — strong signal for builders.`,
      type: "score", strength: "moderate",
    });
  }

  if ((article.build_potential_score ?? 0) >= 22) {
    reasons.push({
      id: "build_potential", icon: "Hammer", label: "High build potential",
      detail: "Strong signal that something can be built from this.",
      type: "score", strength: "strong",
    });
  }

  if ((article.content_potential_score ?? 0) >= 18) {
    reasons.push({
      id: "content_potential", icon: "Megaphone", label: "Content opportunity",
      detail: "Good candidate for a reel, post, or video.",
      type: "score", strength: "moderate",
    });
  }

  if ((article.virality_score ?? 0) >= 22) {
    reasons.push({
      id: "trending", icon: "Zap", label: "Trending topic",
      detail: "High engagement signal in the AI builder community.",
      type: "score", strength: "moderate",
    });
  }

  if ((article.technical_depth_score ?? 0) >= 15) {
    reasons.push({
      id: "technical_depth", icon: "Microscope", label: "Research-worthy",
      detail: "Deep technical content worth studying.",
      type: "score", strength: "moderate",
    });
  }

  // 2. Behavior-based reasons (from saved history)
  const catSaved      = (catCounts.get(cat) ?? {})["saved"]        ?? 0;
  const catResearching = (catCounts.get(cat) ?? {})["investigating"] ?? 0;
  const catBuilt      = (catCounts.get(cat) ?? {})["reviewed"]      ?? 0;

  if (catSaved >= 2) {
    reasons.push({
      id: "saved_similar", icon: "Bookmark", label: "Saved similar articles",
      detail: `You've saved ${catSaved} articles in ${cat}.`,
      type: "behavior", strength: catSaved >= 5 ? "strong" : "moderate",
    });
  } else if (catSaved === 1) {
    reasons.push({
      id: "saved_similar", icon: "Bookmark", label: "Saved similar articles",
      detail: `You've saved an article in ${cat} before.`,
      type: "behavior", strength: "weak",
    });
  }

  if (catResearching >= 1) {
    reasons.push({
      id: "researching", icon: "SearchCode", label: `Researching ${cat}`,
      detail: `You're actively investigating ${catResearching} article${catResearching > 1 ? "s" : ""} in this area.`,
      type: "behavior", strength: "strong",
    });
  }

  if (catBuilt >= 1) {
    reasons.push({
      id: "built", icon: "CheckCircle2", label: `Built in ${cat}`,
      detail: `You've already shipped something in this category.`,
      type: "behavior", strength: "moderate",
    });
  }

  // 3. Interest/topic-based reasons (from user profile)
  if (profile?.favorite_topics?.length) {
    for (const topic of profile.favorite_topics) {
      const topicLabel = TOPIC_KEYWORDS[topic] ? topic : null;
      const keywords   = TOPIC_KEYWORDS[topic as keyof typeof TOPIC_KEYWORDS] ?? [];
      const catMatch   = cat.toLowerCase() === topic.toLowerCase() ||
                         cat.toLowerCase().replace(/\s+/g, "-") === topic;
      const kwMatch    = keywords.some((kw) => haystack.includes(kw));

      if (catMatch || kwMatch) {
        const displayTopic = cat.toLowerCase() === topic.toLowerCase() ? cat : topic;
        reasons.push({
          id:     `interest_${topic}`,
          icon:   "Star",
          label:  `Interested in ${displayTopic}`,
          detail: `${displayTopic} is in your tracked topics.`,
          type:   "interest",
          strength: catMatch ? "strong" : "moderate",
        });
        break; // one topic reason is enough
      }
    }
  }

  // 4. Tool-based reasons (from user profile tools)
  if (profile?.tools?.length) {
    for (const tool of profile.tools) {
      const toolKws = TOOL_KEYWORDS[tool] ?? [tool.toLowerCase()];
      if (toolKws.some((kw) => haystack.includes(kw))) {
        reasons.push({
          id:     `tool_${tool}`,
          icon:   "Wrench",
          label:  `Uses ${tool}`,
          detail: `${tool} appears in this article and is in your stack.`,
          type:   "tool",
          strength: "moderate",
        });
        break; // one tool reason is enough
      }
    }
  }

  // Fallback if no reasons found
  if (reasons.length === 0) {
    reasons.push({
      id: "default", icon: "Radar",
      label: "In your AI builder feed",
      detail: "This article was surfaced by the builder scoring pipeline.",
      type: "score", strength: "weak",
    });
  }

  // ── Score bars ────────────────────────────────────────────────────────────

  const scoreBars: ScoreBar[] = SCORE_BAR_DEFS.map((def) => ({
    key:   def.key,
    label: def.label,
    value: (article as unknown as Record<string, number>)[def.key] ?? 0,
    max:   def.max,
    color: def.color,
  }));

  const response: WhyResponse = {
    reasons,
    scoreBars,
    builderScore: score,
  };

  return Response.json({ ok: true, ...response });
}
