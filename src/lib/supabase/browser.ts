"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Creates a Supabase client for use in Client Components.
 *  Automatically persists the session to cookies so Server Components
 *  and middleware can read it. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
