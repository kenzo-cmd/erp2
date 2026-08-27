import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user's id, or null.
 *
 * getClaims() verifies the JWT signature rather than trusting the cookie.
 * Every route handler calls this first - "the route handler checks auth" is
 * on the Stage 6 security checklist, and RLS alone is not an excuse to skip
 * it: RLS decides which ROWS you may touch, but an unauthenticated request
 * should be told 401, not handed an empty result.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}
