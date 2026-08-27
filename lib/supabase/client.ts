import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for CLIENT COMPONENTS (code running in the browser).
 *
 * Everything here ships to the visitor's browser, so the only key that may
 * appear is the PUBLISHABLE key. It is public by design - what it can actually
 * do is decided by the row level security policies on the database, which we
 * write in Stage 4. Until then, it can do anything, which is the point.
 *
 * The service role key must NEVER be used here, or in any NEXT_PUBLIC_*
 * variable. It bypasses every security policy.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
