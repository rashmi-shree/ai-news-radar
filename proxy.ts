import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that never require authentication
const PUBLIC_ROUTES = ["/", "/feed", "/login", "/signup", "/auth"];

// Routes that are only accessible when NOT authenticated
const AUTH_ONLY_ROUTES = ["/login", "/signup"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

export async function proxy(request: NextRequest) {
  // Start with a plain next-response so we can mutate cookies on it.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward updated cookies to both the request (for downstream
          // middleware/route handlers) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the recommended pattern from @supabase/ssr.
  // getUser() makes a lightweight round-trip to validate the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated user visits /login or /signup → send to feed
  if (user && AUTH_ONLY_ROUTES.some((r) => pathname === r)) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // Unauthenticated user visits a protected route → send to login
  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimization)
     *  - favicon.ico
     *  - api/cron      (internal cron — authenticated via CRON_SECRET header)
     *  - api/news      (public ingestion endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/cron|api/news).*)",
  ],
};
