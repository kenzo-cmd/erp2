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

  // head: true returns the count with no rows - we want the number, not the
  // data. RLS means these are THIS user's counts, not everyone's.
  const [items, warehouses, movements] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("warehouses").select("id", { count: "exact", head: true }),
    supabase.from("stock_movements").select("id", { count: "exact", head: true }),
  ]);

  const itemCount = items.count ?? 0;
  const warehouseCount = warehouses.count ?? 0;
  const movementCount = movements.count ?? 0;

  // A brand new account owns nothing, because every policy is keyed on
  // owner_id. That is correct behaviour, but an empty app with no
  // instructions is a dead end - so tell them what order to do things in.
  const isNewAccount = itemCount === 0 || warehouseCount === 0;

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{String(claims.email)}</strong>
      </p>

      <SignOutButton />

      {isNewAccount ? (
        <>
          <h2>Start here</h2>
          <p style={{ maxWidth: 560 }}>
            This account is empty. You only ever see your own data, so a new
            account starts with nothing. Do these in order:
          </p>
          <ol style={{ maxWidth: 560 }}>
            <li>
              <Link href="/warehouses">Create a warehouse</Link>
              {warehouseCount > 0 ? " — done" : ""} &mdash; make two if you want
              to try a transfer
            </li>
            <li>
              <Link href="/items">Create an item</Link>
              {itemCount > 0 ? " — done" : ""}
            </li>
            <li>
              On <Link href="/items">Items</Link>, press{" "}
              <strong>Movements</strong> next to that item and record a RECEIPT,
              so there is stock to move
            </li>
            <li>
              <Link href="/transfers">Transfer</Link> some of it to your second
              warehouse
            </li>
            <li>
              Confirm the <Link href="/report">Report</Link> reflects it
            </li>
          </ol>
        </>
      ) : (
        <>
          <h2>Your data</h2>
          <ul>
            <li>{itemCount} items</li>
            <li>{warehouseCount} warehouses</li>
            <li>{movementCount} stock movements</li>
          </ul>
        </>
      )}

      <h2>Screens</h2>
      <ul>
        <li>
          <Link href="/items">Items</Link> &mdash; create, edit, deactivate,
          record movements
        </li>
        <li>
          <Link href="/warehouses">Warehouses</Link>
        </li>
        <li>
          <Link href="/transfers">Transfers</Link> &mdash; move stock between
          warehouses
        </li>
        <li>
          <Link href="/report">Report</Link> &mdash; stock on hand per item per
          warehouse
        </li>
      </ul>
    </main>
  );
}
