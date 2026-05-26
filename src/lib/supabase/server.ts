import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/** Creates a Supabase client that reads/writes session cookies.
 *  Must be called inside a Server Component, Route Handler, or Server Action. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // Middleware already refreshes the session so this is safe to ignore.
          }
        },
      },
    }
  );
}

/** Returns the authenticated Supabase user, or null if not signed in. */
export async function getServerUser(): Promise<User | null> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

/** Returns the authenticated user's ID.
 *  Throws a redirect-friendly error string when called on a protected route
 *  but no session exists (middleware should have already redirected). */
export async function getServerUserId(): Promise<string> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthenticated");
  return user.id;
}
