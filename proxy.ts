import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * NOT middleware.ts. Next.js 16 renamed this file convention to proxy.ts and
 * the exported function to `proxy`. Verified against the docs shipped with the
 * installed version at node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md.
 *
 * This runs on the server before any page renders, and does two jobs:
 *   1. refresh the auth token and hand the new cookie to both the request and
 *      the response, so Server Components downstream see a valid session
 *   2. bounce logged-out visitors away from protected routes
 */

// Routes anyone may visit while logged out.
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to the request so anything reading cookies later in THIS
          // request sees the refreshed token...
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          // ...and to the response so the browser stores it for NEXT time.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: no code between createServerClient and getClaims().
  // Anything in between can run before the session is refreshed, which
  // produces sessions that randomly drop and are miserable to debug.
  //
  // getClaims() verifies the JWT's SIGNATURE, locally, using the project's
  // published public keys. getSession() would just read the cookie and
  // believe it - and a cookie is something an attacker controls.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // API routes must NOT be redirected. A redirect to an HTML login page is a
  // useless answer to a fetch() - the caller gets 307 and a page of markup
  // where it expected JSON. Route handlers do their own auth check and
  // return a proper 401. The session refresh above still applies to them.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (!claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already signed in? Don't show the login form again.
  if (claims && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Must return THIS object, not a fresh NextResponse.next(), or the
  // refreshed cookies set above are thrown away.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Every path except:
     *   _next/static, _next/image  - build output, no auth needed
     *   favicon.ico, image files   - static assets
     * Running auth on those is pure latency for no benefit.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
