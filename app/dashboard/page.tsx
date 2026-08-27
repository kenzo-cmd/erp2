import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../sign-out-button";

// Server Component, and an async one. It can await a database call directly -
// that is the thing a Client Component cannot do.
export default async function DashboardPage() {
  const supabase = await createClient();

  // This is the SECURITY BOUNDARY. proxy.ts also checks, but that is a
  // convenience: it redirects early so the user does not watch a protected
  // page flash before bouncing. If you deleted the proxy check, this page
  // would still be safe. If you deleted THIS check and trusted only the
  // proxy, any request that the matcher does not cover reaches the page with
  // no auth check at all.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{String(claims.email)}</strong>
      </p>

      <SignOutButton />

      <h2>Screens</h2>
      <ul>
        <li>
          <Link href="/items">Items</Link>
        </li>
        <li>
          <Link href="/warehouses">Warehouses</Link>
        </li>
        <li>
          <Link href="/transfers">Transfers</Link>
        </li>
        <li>Report &mdash; Stage 6</li>
      </ul>
    </main>
  );
}
