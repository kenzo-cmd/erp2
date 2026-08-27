"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Needs onClick, so it is a Client Component - but it is only a button.
// Keeping it in its own file means /dashboard can stay a Server Component
// and still fetch data directly from the database.
export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
