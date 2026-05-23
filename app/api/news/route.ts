import { fetchAllFeeds } from "@/src/lib/rss/fetchFeeds";

export async function GET() {
  try {
    const items = await fetchAllFeeds();

    return Response.json({ ok: true, count: items.length, items });
  } catch (error) {
    console.error("[GET /api/news]", error);

    return Response.json(
      { ok: false, error: "Failed to fetch feeds." },
      { status: 500 }
    );
  }
}
