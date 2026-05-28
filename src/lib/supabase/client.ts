import { createBrowserClient } from "@supabase/ssr";

// Use the SSR-aware browser client so sessions stored in cookies
// (by @supabase/ssr) are automatically included in every query
// made from client components.  Falls back to anon in Node.js contexts
// (API routes), which is fine while permissive policies are in effect.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
