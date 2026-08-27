import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for SERVER COMPONENTS and ROUTE HANDLERS.
 *
 * Note this function is `async` and cookies() is AWAITED. In Next.js 16
 * cookies() returns a Promise. Older tutorials write `const cookieStore =
 * cookies()` with no await; that is the single most common stale-tutorial bug
 * in this stack and it fails in a way that does not explain itself.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Only getAll and setAll are supported. The individual get/set/remove
        // methods are deprecated and cause auth loops and lost sessions.
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // A Server Component cannot write headers, so this throws there.
            // That is fine and expected: proxy.ts refreshes the session on
            // every request, so the cookie still gets written where it counts.
          }
        },
      },
    },
  );
}
