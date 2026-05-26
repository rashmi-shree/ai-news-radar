import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Supabase redirects here after OAuth sign-in (Google) and magic-link flows.
 * We exchange the temporary `code` for a real session, then redirect the user
 * to their original destination (or /feed as the default).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — return to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
